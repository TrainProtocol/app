import { FC, useEffect, useState } from "react";
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import ButtonStatus from "./Status/ButtonStatus";
import { useRouter } from "next/router";
import { useFee } from "../../../../context/feeContext";
import useCommitDetailsPolling from "../../../../hooks/htlc/useCommitDetailsPolling";
import useLockDetailsPolling from "../../../../hooks/htlc/useLockDetailsPolling";
import useRefundStatusPolling from "../../../../hooks/htlc/useRefundStatusPolling";

export const UserCommitAction: FC = () => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, onCommit, commitId, updateCommit, srcAtomicContract } = useAtomicState();
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const { fee } = useFee()

    const atomicContract = srcAtomicContract 
    const destLpAddress = fee?.quote?.destinationSolverAddress
    const srcLpAddress = fee?.quote?.sourceSolverAddress

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

            const { commitId, hash } = await provider.createPreHTLC({
                address,
                amount: amount.toString(),
                destinationChain: destination_network.name,
                sourceChain: source_network.name,
                destinationAsset: destination_asset.symbol,
                sourceAsset: source_asset,
                destLpAddress,
                srcLpAddress,
                tokenContractAddress: source_asset.contract as `0x${string}`,
                decimals: source_asset.decimals,
                atomicContract: atomicContract,
                chainId: source_network.chainId,
            }) || {}
            if (commitId && hash) {
                onCommit(commitId, hash)

                posthog.capture("Commit", {
                    commitId: commitId,
                    amount: amount,
                    sourceNetwork: source_network.name,
                    destinationNetwork: destination_network.name,
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
    useCommitDetailsPolling({
        network: source_network,
        commitId: commitId,
        contractAddress: atomicContract,
        sourceAsset: source_asset,
        onDetailsFound: (details) => {
            updateCommit('sourceDetails', details)
        }
    })

    if (!source_network) return <></>

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            commitId ?
                <ButtonStatus
                    isDisabled={true}
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


export const UserLockAction: FC = () => {
    const { source_network, commitId, sourceDetails, updateCommit, userLocked, source_asset, destinationDetails, commitFromApi, srcAtomicContract, solver } = useAtomicState()

    const { provider } = useWallet(source_network, 'withdrawal')

    const wallet = provider?.activeWallet

    const handleLockAssets = async () => {
        try {
            if (!provider)
                throw new Error("No source provider")
            if (!destinationDetails?.hashlock)
                throw new Error("No destination hashlock")
            if (!srcAtomicContract)
                throw new Error("No atomic contract")
            if (!source_network)
                throw new Error("No source network")
            if (!solver)
                throw new Error("No solver")

            await provider.addLock({
                type: source_asset?.contract ? 'erc20' : 'native',
                chainId: source_network?.chainId,
                id: commitId as string,
                hashlock: destinationDetails?.hashlock,
                contractAddress: srcAtomicContract as `0x${string}`,
                lockData: destinationDetails,
                sourceAsset: source_asset,
                solver: solver
            })

            posthog.capture("Lock", {
                commitId: commitId,
                hashlock: destinationDetails?.hashlock,
                contractAddress: srcAtomicContract,
                lockData: destinationDetails,
                chainId: source_network?.chainId,
            })

            updateCommit('userLocked', true)
        }
        catch (e) {
            updateCommit('error', { message: e.details || e.message })
        }
        finally {
        }
    }

    // Poll for lock details (hashlock) using SWR
    useLockDetailsPolling({
        network: source_network,
        commitId: commitId,
        contractAddress: srcAtomicContract,
        sourceAsset: source_asset,
        hasHashlock: !!sourceDetails?.hashlock,
        onDetailsFound: (details) => {
            updateCommit('sourceDetails', details)
        }
    })

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            userLocked ?
                <ButtonStatus
                    isDisabled={true}
                >
                    Sign to finalize
                </ButtonStatus>
                :
                source_network && <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network}
                    networkChainId={source_network.chainId}
                    onClick={handleLockAssets}
                >
                    Sign to finalize
                </WalletActionButton>
        }
    </div>

}

export const UserRefundAction: FC = () => {
    const { source_network, commitId, sourceDetails, source_asset, destination_network, destination_asset, updateCommit, setAtomicQuery, atomicQuery, commitFromApi, destAtomicContract, srcAtomicContract } = useAtomicState()
    const { provider: source_provider } = useWallet(source_network, 'withdrawal')
    const { provider: destination_provider } = useWallet(destination_network, 'withdrawal')

    const [requestedRefund, setRequestedRefund] = useState(false)
    const router = useRouter()

    const wallet = source_provider?.activeWallet

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!commitId) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!source_asset) throw new Error("No source asset")
            if (!srcAtomicContract) throw new Error("No atomic contract")

            const res = await source_provider?.refund({
                type: source_asset?.contract ? 'erc20' : 'native',
                id: commitId,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chainId,
                contractAddress: srcAtomicContract as `0x${string}`,
                sourceAsset: source_asset,
            })

            posthog.capture("Refund", {
                commitId: commitId,
                commit: sourceDetails,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chainId,
                contractAddress: srcAtomicContract
            })

            if (res) {
                setAtomicQuery({ ...atomicQuery, refundTxId: res })

                const basePath = router?.basePath || ""
                var atomicURL = window.location.protocol + "//"
                    + window.location.host + `${basePath}/swap`;
                const atomicParams = new URLSearchParams({ ...atomicQuery, commitId, refundTxId: res })
                if (atomicParams) {
                    atomicURL += `?${atomicParams}`
                }
                window.history.replaceState({ ...window.history.state, as: atomicURL, url: atomicURL }, '', atomicURL);

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
        commitId: commitId,
        contractAddress: srcAtomicContract,
        asset: source_asset,
        onStatusUpdate: (details) => {
            updateCommit('sourceDetails', details)
        }
    })

    // Poll for destination chain status using SWR
    useRefundStatusPolling({
        network: destination_network,
        commitId: commitId,
        contractAddress: destAtomicContract,
        asset: destination_asset,
        onStatusUpdate: (details) => {
            updateCommit('destinationDetails', details)
        }
    })

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            ((requestedRefund || !!atomicQuery.refundTxId) && sourceDetails?.claimed !== 2) ?
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
