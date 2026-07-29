import { FC, useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import { useCreateSwap, useRefund, LockStatus, type SwapQuote, useSharedSecretDerivation, type StartSwapParams } from "@train-protocol/react"
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { ActionWrapper, SwapViewType } from ".";
import { useSelectedAccount } from "@/context/swapAccounts";
import { Address } from "@/lib/address";
import { useSwapStore } from "@/stores/swapStore";
import { useSettingsState } from "@/context/settings";
import formatAmount from "@/lib/formatAmount";

type UserCommitActionProps = {
    quote?: SwapQuote
    solverId?: string
    type: SwapViewType
    setError: (error: Error | undefined) => void
    destinationAddress?: string
    refreshQuote: () => Promise<SwapQuote | undefined>
}

export const UserLockAction: FC<UserCommitActionProps> = ({ quote, type, setError, destinationAddress, refreshQuote }) => {
    // Pre-lock only — route info comes from the quote; caller supplies the user's destination address.
    const { hashlock } = useActiveSwap()
    const { createSwap } = useCreateSwap()
    const { networks } = useSettingsState()
    const source_network = networks.find(n => n.caip2Id === quote?.route.source.network)
    const destination_network = networks.find(n => n.caip2Id === quote?.route.destination.network)
    const source_asset = quote?.route.source.tokenContract && source_network?.tokens.find(t => Address.equals(t.contract, quote?.route.source.tokenContract, source_network))
    const destination_asset = quote?.route.destination.tokenContract && destination_network?.tokens.find(t => Address.equals(t.contract, quote?.route.destination.tokenContract, destination_network))

    const address = destinationAddress

    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const { isLoggedIn } = useSharedSecretDerivation()
    const sourceAccount = useSelectedAccount('from', source_network?.caip2Id)
    const sourceWallet = (sourceAccount?.address && source_network) ? provider?.connectedWallets?.find(w => w.addresses.find(a => Address.equals(a, sourceAccount?.address, source_network))) : undefined
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)

    const atomicContract = source_network?.trainContract
    const destContract = destination_network?.trainContract

    const handleUserLock = async () => {
        try {
            if (!quote || !source_network || !sourceWallet || !sourceAccount || !provider?.activeWallet || !address || !destination_network || !destination_asset || !source_asset || !atomicContract || !destContract) throw new Error("Missing params")

            if (provider && sourceWallet && (sourceWallet.chainId != source_network.chainId) && provider.switchChain) await provider.switchChain(sourceWallet, source_network.chainId)

            if (!isLoggedIn) throw new Error('Please log in first')

            // Reward and solver data are market-sensitive. Fetch a new signed
            // quote at the final action boundary instead of submitting a quote
            // that may have aged for a full polling interval in the modal.
            const freshQuote = await refreshQuote()
            if (!freshQuote) throw new Error('The quote is no longer available. Please try again.')
            if (!freshQuote.amount) throw new Error('The refreshed quote has no source amount')
            if (freshQuote.quoteExpirationTimestampInSeconds <= Math.floor(Date.now() / 1000)) {
                throw new Error('The refreshed quote has expired. Please try again.')
            }

            const amountInBaseUnits = BigInt(freshQuote.amount)
            if (amountInBaseUnits <= 0n) throw new Error('The refreshed quote has an invalid source amount')
            const amount = formatAmount(amountInBaseUnits, source_asset.decimals)

            const params: StartSwapParams = {
                sourceNetwork: source_network.caip2Id,
                destinationNetwork: destination_network.caip2Id,
                amount,
                sourceAsset: source_asset,
                destinationAsset: destination_asset,
                sourceAddress: sourceAccount?.address,
                destinationAddress: address,
                srcContract: atomicContract,
                destContract: destContract,
                chainId: source_network.chainId,
                quote: freshQuote
            }

            const hl = await createSwap(params)
            setActiveHashlock(hl)

            posthog.capture("UserLock", {
                amount: amount,
                sourceNetwork: source_network.caip2Id,
                destinationNetwork: destination_network.caip2Id,
                sourceAsset: source_asset.symbol,
                destinationAsset: destination_asset.symbol,
                userAddress: address,
            })
        }
        catch (e) {
            console.error('[UserLock] failed', e?.message ?? String(e), ...(e?.logs ? [e.logs] : []))
            setError(e instanceof Error ? e : new Error(String(e)))
        }
    }

    if (!source_network || hashlock) return null

    return (
        <ActionWrapper type={type}>
            <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
                <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network}
                    networkChainId={source_network.chainId}
                    onClick={handleUserLock}
                    type={type}
                >
                    Confirm in wallet
                </WalletActionButton>
            </div>
        </ActionWrapper>
    )
}

export const UserRefundAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { sourceNetwork, sourceToken, refundTxId, srcContract, sourceDetails } = useActiveSwap()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { refund: doRefund } = useRefund()
    const { provider: source_provider } = useWallet(sourceNetwork, 'withdrawal')
    const sourceAccount = useSelectedAccount('from', sourceNetwork?.caip2Id)
    const sourceWallet = (sourceAccount?.address && sourceNetwork) ? source_provider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, sourceNetwork)) : undefined

    const [requestedRefund, setRequestedRefund] = useState(false)

    const wallet = source_provider?.activeWallet

    const handleRefundAssets = async () => {
        try {
            if (!sourceNetwork) throw new Error("No source network")
            if (!activeHashlock) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!sourceToken) throw new Error("No source asset")
            if (!srcContract) throw new Error("No atomic contract")
            if (!sourceWallet) throw new Error("No wallet client")

            if (source_provider?.activeWallet && (source_provider.activeWallet.chainId != sourceNetwork.chainId) && source_provider.switchChain)
                await source_provider.switchChain(source_provider.activeWallet, sourceNetwork.chainId)

            const res = await doRefund({ hashlock: activeHashlock, address: sourceAccount?.address })

            posthog.capture("Refund", {
                userLock: sourceDetails,
                hashlock: sourceDetails?.hashlock,
                chainId: sourceNetwork.chainId,
                contractAddress: srcContract
            })

            if (res) {
                setRequestedRefund(true)
            }
        }
        catch (e) {
            console.error('[Refund] failed', e)
        }
    }


    if ((requestedRefund || !!refundTxId) && sourceDetails?.status !== LockStatus.Refunded) return null

    return (
        <ActionWrapper type={type}>
            <WalletActionButton
                activeChain={wallet?.chainId}
                isConnected={!!wallet}
                network={sourceNetwork!}
                networkChainId={Number(sourceNetwork?.chainId)}
                onClick={handleRefundAssets}
                type={type}
            >
                Cancel & Refund
            </WalletActionButton>
        </ActionWrapper>
    )
}
