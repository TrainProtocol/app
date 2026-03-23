import { FC, useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useSwapData } from "@/hooks/useSwapData";
import { useSwapState, useSwap } from "@train-protocol/react";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { LockStatus } from "@train-protocol/sdk";
import type { SwapQuote } from "@train-protocol/sdk";
import { SwapViewType } from ".";
import { useSharedSecretDerivation } from "@train-protocol/react";
import { useSelectedAccount } from "@/context/swapAccounts";
import { Address } from "@/lib/address";
import { type StartSwapParams } from "@train-protocol/react";
import { NetworkContractType } from "@/Models/Network";

type UserCommitActionProps = {
    quote?: SwapQuote
    type: SwapViewType
}

export const UserLockAction: FC<UserCommitActionProps> = ({ quote, type }) => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, hashlock, srcAtomicContract, solver } = useSwapData();
    const { setError } = useSwap();
    const { startSwap } = useSwap();
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const { derivedKey } = useSharedSecretDerivation()
    const sourceAccount = useSelectedAccount('from', source_network?.caip2Id)
    const sourceWallet = (sourceAccount?.address && source_network) ? provider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, source_network)) : undefined

    const atomicContract = srcAtomicContract
    const destContract = destination_network?.contracts?.find(c => c.type === NetworkContractType.Train)?.address
    const destLpAddress = quote?.destinationSolverAddress
    const srcLpAddress = quote?.sourceSolverAddress

    const handleUserLock = async () => {
        try {
            if (!quote || !source_network || !sourceWallet || !provider?.activeWallet || !amount || !address || !destination_network || !destination_asset || !source_asset || !atomicContract || !destLpAddress || !srcLpAddress || !destContract) throw new Error("Missing params")

            if (provider && sourceWallet && (sourceWallet.chainId != source_network.chainId) && provider.switchChain) await provider.switchChain(sourceWallet, source_network.chainId)

            if (!derivedKey) throw new Error('Please login first')

            const params: StartSwapParams = {
                sourceNetwork: source_network.caip2Id,
                destinationNetwork: destination_network.caip2Id,
                amount: amount.toString(),
                sourceAsset: source_asset,
                destinationAsset: destination_asset,
                sourceAddress: sourceWallet.address,
                destinationAddress: address,
                solverId: solver ?? '',
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

            await startSwap(params, derivedKey)

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
            setError(new Error(e?.details || e?.message || e?.code || e?.name || 'Unknown error'))
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
    const { source_network, hashlock, source_asset, refundTxId, srcAtomicContract } = useSwapData()
    const { sourceDetails } = useSwapState()
    const { setError, refund } = useSwap()
    const { provider: source_provider } = useWallet(source_network, 'withdrawal')
    const sourceAccount = useSelectedAccount('from', source_network?.caip2Id)
    const sourceWallet = (sourceAccount?.address && source_network) ? source_provider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, source_network)) : undefined

    const [requestedRefund, setRequestedRefund] = useState(false)

    const wallet = source_provider?.activeWallet

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!hashlock) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!source_asset) throw new Error("No source asset")
            if (!srcAtomicContract) throw new Error("No atomic contract")
            if (!sourceWallet) throw new Error("No wallet client")

            if (source_provider?.activeWallet && (source_provider.activeWallet.chainId != source_network.chainId) && source_provider.switchChain)
                await source_provider.switchChain(source_provider.activeWallet, source_network.chainId)

            const res = await refund()

            posthog.capture("Refund", {
                userLock: sourceDetails,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chainId,
                contractAddress: srcAtomicContract
            })

            if (res) {
                setRequestedRefund(true)
            }
        }
        catch (e) {
            setError(new Error(e.details || e.message))
        }
    }


    if ((requestedRefund || !!refundTxId) && sourceDetails?.status !== LockStatus.Refunded) return <></>

    return <WalletActionButton
        activeChain={wallet?.chainId}
        isConnected={!!wallet}
        network={source_network!}
        networkChainId={Number(source_network?.chainId)}
        onClick={handleRefundAssets}
        type={type}
    >
        Cancel & Refund
    </WalletActionButton>
}
