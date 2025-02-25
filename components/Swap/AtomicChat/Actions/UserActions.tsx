import { FC, useEffect, useState } from "react";
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./Status/ActionStatus";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import ButtonStatus from "./Status/ButtonStatus";
import { NextRouter, useRouter } from "next/router";
import { resolvePersistantQueryParams } from "../../../../helpers/querryHelper";
import { ContractType, ManagedAccountType } from "../../../../Models/Network";

export const UserCommitAction: FC = () => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, onCommit, commitId, updateCommit } = useAtomicState();
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet

    // const txId = router.query.txId as `0x${string}`
    // const { status } = useWaitForTransactionReceipt({
    //     hash: txId,
    //     chainId: Number(source_network?.chain_id),
    // });

    const atomicContract = source_network?.contracts.find(c => source_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address
    const lpAddress = source_network?.managed_accounts.find(a => a.type === ManagedAccountType.LP)?.address
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
            if (!lpAddress) {
                throw new Error("No lp address")
            }

            const { commitId, hash } = await provider.createPreHTLC({
                address,
                amount: amount.toString(),
                destinationChain: destination_network.name,
                sourceChain: source_network.name,
                destinationAsset: destination_asset.symbol,
                sourceAsset: source_asset,
                lpAddress,
                tokenContractAddress: source_asset.contract as `0x${string}`,
                decimals: source_asset.decimals,
                atomicContract: atomicContract,
                chainId: source_network.chain_id,
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
            updateCommit('error', e.details || e.message)
        }
    }

    // useEffect(() => {
    //     if (status === 'error') {
    //         onCommit(undefined as any, undefined as any)
    //         setError('Transaction failed')
    //     }
    // }, [status])

    useEffect(() => {
        let commitHandler: any = undefined
        if (source_network && commitId) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!provider)
                        throw new Error("No source provider")

                    const data = await provider.getDetails({
                        type: source_asset?.contract ? 'erc20' : 'native',
                        chainId: source_network.chain_id,
                        id: commitId,
                        contractAddress: atomicContract as `0x${string}`,
                    })
                    if (data && data.sender != '0x0000000000000000000000000000000000000000') {
                        updateCommit('sourceDetails', data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => {
            clearInterval(commitHandler)
        }
    }, [source_network, commitId])

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
                    networkChainId={source_network.chain_id}
                    onClick={handleCommit}
                >
                    Request
                </WalletActionButton>
        }
    </div>
}


export const UserLockAction: FC = () => {
    const { source_network, commitId, sourceDetails, updateCommit, userLocked, source_asset, destinationDetails } = useAtomicState()

    const { provider } = useWallet(source_network, 'withdrawal')

    const wallet = provider?.activeWallet

    const atomicContract = source_network?.contracts.find(c => source_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address

    const handleLockAssets = async () => {
        try {
            if (!provider)
                throw new Error("No source provider")
            if (!destinationDetails?.hashlock)
                throw new Error("No destination hashlock")
            if (!atomicContract)
                throw new Error("No atomic contract")

            await provider.addLock({
                type: source_asset?.contract ? 'erc20' : 'native',
                chainId: source_network.chain_id,
                id: commitId as string,
                hashlock: destinationDetails?.hashlock,
                contractAddress: atomicContract as `0x${string}`,
                lockData: destinationDetails,
                sourceAsset: source_asset,
            })

            posthog.capture("Lock", {
                commitId: commitId,
                hashlock: destinationDetails?.hashlock,
                contractAddress: atomicContract,
                lockData: destinationDetails,
                chainId: source_network.chain_id,
            })

            updateCommit('userLocked', true)
        }
        catch (e) {
            updateCommit('error', e.details || e.message)
        }
        finally {
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined
        if (!sourceDetails?.hashlock && atomicContract) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!provider)
                        throw new Error("No source provider")

                    const data = await provider.getDetails({
                        type: source_asset?.contract ? 'erc20' : 'native',
                        chainId: source_network.chain_id,
                        id: commitId as string,
                        contractAddress: atomicContract as `0x${string}`,
                    })
                    if (data?.hashlock) {
                        updateCommit('sourceDetails', data)
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [provider])

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            userLocked ?
                <ButtonStatus
                    isDisabled={true}
                >
                    Sign & Confirm
                </ButtonStatus>
                :
                source_network && <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network}
                    networkChainId={source_network.chain_id}
                    onClick={handleLockAssets}
                >
                    Sign & Confirm
                </WalletActionButton>
        }
    </div>

}

export const UserRefundAction: FC = () => {
    const { source_network, commitId, sourceDetails, source_asset, destination_network, destination_asset, updateCommit, setAtomicQuery, atomicQuery } = useAtomicState()
    const { provider: source_provider } = useWallet(source_network, 'withdrawal')
    const { provider: destination_provider } = useWallet(destination_network, 'withdrawal')

    const [requestedRefund, setRequestedRefund] = useState(false)
    const router = useRouter()

    const wallet = source_provider?.activeWallet

    const destinationAtomicContract = destination_network?.contracts.find(c => destination_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address
    const sourceAtomicContract = source_network?.contracts.find(c => source_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!commitId) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!source_asset) throw new Error("No source asset")
            if (!sourceAtomicContract) throw new Error("No atomic contract")

            const res = await source_provider?.refund({
                type: source_asset?.contract ? 'erc20' : 'native',
                id: commitId,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chain_id,
                contractAddress: sourceAtomicContract as `0x${string}`,
                sourceAsset: source_asset,
            })

            posthog.capture("Refund", {
                commitId: commitId,
                commit: sourceDetails,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chain_id,
                contractAddress: sourceAtomicContract
            })

            if (res) {
                setRefundQuery(res, router)
                setAtomicQuery({ ...atomicQuery, refundTxId: res })
                setRequestedRefund(true)
            }
        }
        catch (e) {
            updateCommit('error', e.details || e.message)
        }
    }

    useEffect(() => {
        let commitHandler: any = undefined;
        (async () => {
            commitHandler = setInterval(async () => {
                if (!source_provider)
                    throw new Error("No source provider")
                if (!sourceAtomicContract)
                    throw new Error("No atomic contract")

                const data = await source_provider.getDetails({
                    type: source_asset?.contract ? 'erc20' : 'native',
                    chainId: source_network.chain_id,
                    id: commitId as string,
                    contractAddress: sourceAtomicContract as `0x${string}`,
                })
                if (data?.claimed == 2) {
                    updateCommit('sourceDetails', data)
                    clearInterval(commitHandler)
                }
            }, 5000)
        })()
        return () => clearInterval(commitHandler)
    }, [source_provider])

    useEffect(() => {
        let lockHandler: any = undefined
        if (destination_provider) {
            lockHandler = setInterval(async () => {
                if (!commitId)
                    throw Error("No commitId")
                if (!destinationAtomicContract)
                    throw Error("No atomic contract")

                const data = await destination_provider.getDetails({
                    type: destination_asset?.contract ? 'erc20' : 'native',
                    chainId: destination_network.chain_id,
                    id: commitId,
                    contractAddress: destinationAtomicContract as `0x${string}`,
                })

                if (data) updateCommit('destinationDetails', data)
                if (data?.claimed == 2) {
                    clearInterval(lockHandler)
                }
            }, 5000)
        }
        return () => {
            lockHandler && clearInterval(lockHandler);
        };
    }, [source_provider])

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            (requestedRefund || sourceDetails?.claimed == 2) ?
                <></>
                :
                <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network!}
                    networkChainId={Number(source_network?.chain_id)}
                    onClick={handleRefundAssets}
                >
                    Cancel & Refund
                </WalletActionButton>
        }
    </div>
}

const setRefundQuery = (refundTxId: string, router: NextRouter) => {
    const basePath = router?.basePath || ""
    var swapURL = window.location.protocol + "//"
        + window.location.host + `${basePath}/atomic`;
    const params = resolvePersistantQueryParams(router.query)
    if (router.query && Object.keys(router.query).length) {
        const search = new URLSearchParams(router.query as any);
        if (search)
            swapURL += `?${search}&refundTxId=${refundTxId}`;
    }

    window.history.pushState({ ...window.history.state, as: swapURL, url: swapURL }, '', swapURL);
}