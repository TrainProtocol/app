import { FC, useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import { useCreateSwap, useRefund, LockStatus, type SwapQuote, useSharedSecretDerivation, type StartSwapParams } from "@train-protocol/react"
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { SwapViewType } from ".";
import { useSelectedAccount } from "@/context/swapAccounts";
import { Address } from "@/lib/address";
import { NetworkContractType } from "@/Models/Network";
import { useSwapStore } from "@/stores/swapStore";
import { useFormikContext } from "formik";
import type { SwapFormValues } from "@/components/DTOs/SwapFormValues";

type UserCommitActionProps = {
    quote?: SwapQuote
    solverId?: string
    type: SwapViewType
}

export const UserLockAction: FC<UserCommitActionProps> = ({ quote, solverId, type }) => {
    // Before lock: read from Formik (form values have Network/Token objects)
    const { values } = useFormikContext<SwapFormValues>()
    const { hashlock } = useActiveSwap()
    const { createSwap } = useCreateSwap()
    const source_network = values.from
    const destination_network = values.to
    const source_asset = values.fromCurrency
    const destination_asset = values.toCurrency
    const amount = values.amount ? Number(values.amount) : undefined
    const address = values.destination_address

    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const { isLoggedIn } = useSharedSecretDerivation()
    const sourceAccount = useSelectedAccount('from', source_network?.caip2Id)
    const sourceWallet = (sourceAccount?.address && source_network) ? provider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, source_network)) : undefined
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)

    const atomicContract = source_network?.contracts?.find(c => c.type === NetworkContractType.Train)?.address
    const destContract = destination_network?.contracts?.find(c => c.type === NetworkContractType.Train)?.address
    const destLpAddress = quote?.destinationSolverAddress
    const srcLpAddress = quote?.sourceSolverAddress

    const handleUserLock = async () => {
        try {
            if (!quote || !source_network || !sourceWallet || !provider?.activeWallet || !amount || !address || !destination_network || !destination_asset || !source_asset || !atomicContract || !destLpAddress || !srcLpAddress || !destContract) throw new Error("Missing params")

            if (provider && sourceWallet && (sourceWallet.chainId != source_network.chainId) && provider.switchChain) await provider.switchChain(sourceWallet, source_network.chainId)

            if (!isLoggedIn) throw new Error('Please login first')

            const params: StartSwapParams = {
                sourceNetwork: source_network.caip2Id,
                destinationNetwork: destination_network.caip2Id,
                amount: amount.toString(),
                sourceAsset: source_asset,
                destinationAsset: destination_asset,
                sourceAddress: sourceWallet.address,
                destinationAddress: address,
                solverId: solverId ?? '',
                quote: {
                    signature: quote.signature,
                    receiveAmount: quote.receiveAmount,
                    sourceSolverAddress: srcLpAddress,
                    destinationSolverAddress: destLpAddress,
                    quoteExpirationTimestampInSeconds: quote.quoteExpirationTimestampInSeconds,
                    timelock: quote.timelock,
                    reward: quote.reward,
                    totalFee: quote.totalFee,
                    route: quote.route,
                },
                srcContract: atomicContract,
                destContract: destContract,
                tokenContractAddress: source_asset.contractAddress,
                chainId: source_network.chainId,
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
        }
    }

    if (!source_network) return <></>

    return hashlock ?
        <></>
        :
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
}

export const UserRefundAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { sourceNetwork, hashlock, sourceToken, refundTxId, srcContract, sourceDetails } = useActiveSwap()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { refund: doRefund } = useRefund(activeHashlock)
    const { provider: source_provider } = useWallet(sourceNetwork, 'withdrawal')
    const sourceAccount = useSelectedAccount('from', sourceNetwork?.caip2Id)
    const sourceWallet = (sourceAccount?.address && sourceNetwork) ? source_provider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, sourceNetwork)) : undefined

    const [requestedRefund, setRequestedRefund] = useState(false)

    const wallet = source_provider?.activeWallet

    const handleRefundAssets = async () => {
        try {
            if (!sourceNetwork) throw new Error("No source network")
            if (!hashlock) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!sourceToken) throw new Error("No source asset")
            if (!srcContract) throw new Error("No atomic contract")
            if (!sourceWallet) throw new Error("No wallet client")

            if (source_provider?.activeWallet && (source_provider.activeWallet.chainId != sourceNetwork.chainId) && source_provider.switchChain)
                await source_provider.switchChain(source_provider.activeWallet, sourceNetwork.chainId)

            const res = await doRefund()

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


    if ((requestedRefund || !!refundTxId) && sourceDetails?.status !== LockStatus.Refunded) return <></>

    return <WalletActionButton
        activeChain={wallet?.chainId}
        isConnected={!!wallet}
        network={sourceNetwork!}
        networkChainId={Number(sourceNetwork?.chainId)}
        onClick={handleRefundAssets}
        type={type}
    >
        Cancel & Refund
    </WalletActionButton>
}
