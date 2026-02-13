import { FC, useState } from "react";
import useWallet from "@/hooks/useWallet";
import { useAtomicState } from "@/context/atomicContext";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import ButtonStatus from "./Status/ButtonStatus";
import useUserLockDetailsPolling from "@/hooks/htlc/useCommitDetailsPolling";
import useRefundStatusPolling from "@/hooks/htlc/useRefundStatusPolling";
import { LockStatus } from "@/Models/phtlc/PHTLC";
import { SwapQuote } from "@/lib/trainApiClient";
import { useSwapStore } from "@/stores/swapStore";

type UserCommitActionProps = {
    quote?: SwapQuote
}

export const UserCommitAction: FC<UserCommitActionProps> = ({ quote }) => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, onCommit, hashlock, updateCommit, srcAtomicContract } = useAtomicState();
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet

    const atomicContract = srcAtomicContract
    const destLpAddress = quote?.destinationSolverAddress
    const srcLpAddress = quote?.sourceSolverAddress

    const handleCommit = async () => {
        try {
            if (!amount) {
                throw new Error("No amount specified")
            }
            if (!address) {
                throw new Error("Please enter a valid address")
            }
            if (!destination_network) {
                throw new Error("No destination chain")
            }
            if (!source_network) {
                throw new Error("No source chain")
            }
            if (!source_asset) {
                throw new Error("No source asset")
            }
            if (!destination_asset) {
                throw new Error("No destination asset")
            }
            if (!provider) {
                throw new Error("No source_provider")
            }
            if (!atomicContract) {
                throw new Error("No atomic contract")
            }
            if (!destLpAddress || !srcLpAddress) {
                throw new Error("No lp address")
            }

            if (provider.activeWallet && (provider.activeWallet.chainId != source_network.chainId) && provider.switchChain)
                await provider.switchChain(provider.activeWallet, source_network.chainId)

            const result = await provider.createHTLC({
                address,
                amount: amount.toString(),
                destinationChain: destination_network.slug,
                sourceChain: source_network.slug,
                destinationAsset: destination_asset.symbol,
                sourceAsset: source_asset,
                destLpAddress,
                srcLpAddress,
                tokenContractAddress: source_asset.contractAddress,
                decimals: source_asset.decimals,
                atomicContract,
                chainId: source_network.chainId,
            })
            if (result?.hashlock && result?.hash) {
                onCommit(
                    result.hashlock,
                    result.hash
                )

                posthog.capture("Commit", {
                    hashlock: result.hashlock,
                    amount: amount,
                    sourceNetwork: source_network.slug,
                    destinationNetwork: destination_network.slug,
                    sourceAsset: source_asset.symbol,
                    destinationAsset: destination_asset.symbol,
                    userAddress: address,
                })
            }
        }
        catch (e) {
            updateCommit('error', { message: e.details || e.message })
        }
    }

    // Poll for commit details using SWR
    useUserLockDetailsPolling({
        network: source_network,
        hashlock: hashlock,
        contractAddress: atomicContract,
        sourceAsset: source_asset,
        onDetailsFound: (details) => {
            updateCommit('sourceDetails', details)
        }
    })

    if (!source_network) return <></>

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            hashlock ?
                <ButtonStatus
                    isDisabled={true}
                    isLoading={true}
                >
                    Confirm in wallet
                </ButtonStatus>
                :
                <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network}
                    networkChainId={source_network.chainId}
                    onClick={handleCommit}
                >
                    Confirm in wallet
                </WalletActionButton>
        }
    </div>
}

export const UserRefundAction: FC = () => {
    const { source_network, hashlock, sourceDetails, source_asset, updateCommit, refundTxId, srcAtomicContract } = useAtomicState()
    const { provider: source_provider } = useWallet(source_network, 'withdrawal')

    const [requestedRefund, setRequestedRefund] = useState(false)

    const wallet = source_provider?.activeWallet

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!hashlock) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!source_asset) throw new Error("No source asset")
            if (!srcAtomicContract) throw new Error("No atomic contract")

            const res = await source_provider?.refund({
                type: (source_asset?.contractAddress && source_asset.contractAddress !== '0x0000000000000000000000000000000000000000') ? 'erc20' : 'native',
                id: hashlock,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chainId,
                contractAddress: srcAtomicContract as `0x${string}`,
                sourceAsset: source_asset,
            })

            posthog.capture("Refund", {
                userLock: sourceDetails,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chainId,
                contractAddress: srcAtomicContract
            })

            if (res) {
                useSwapStore.getState().updateSwap(hashlock, { refundTxId: res })
                setRequestedRefund(true)
            }
        }
        catch (e) {
            updateCommit('error', { message: e.details || e.message })
        }
    }

    // Poll for source chain refund status using SWR
    useRefundStatusPolling({
        network: source_network,
        hashlock,
        contractAddress: srcAtomicContract,
        asset: source_asset,
        onStatusUpdate: (details) => {
            updateCommit('sourceDetails', details)
        }
    })

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            ((requestedRefund || !!refundTxId) && sourceDetails?.status !== LockStatus.Refunded) ?
                <ButtonStatus
                    isDisabled={true}
                >
                    Cancel & Refund
                </ButtonStatus>
                :
                <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network!}
                    networkChainId={Number(source_network?.chainId)}
                    onClick={handleRefundAssets}
                >
                    Cancel & Refund
                </WalletActionButton>
        }
    </div>
}
