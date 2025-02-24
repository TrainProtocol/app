import { FC, useEffect } from "react"
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import { WalletActionButton } from "../../buttons";
import { ContractType } from "../../../../Models/Network";

export const RedeemAction: FC = () => {
    const { destination_network, source_network, sourceDetails, destinationDetails, updateCommit, manualClaimRequested, destination_asset, source_asset, commitId, isManualClaimable } = useAtomicState()
    const { getProvider } = useWallet()

    const source_provider = source_network && getProvider(source_network, 'withdrawal')
    const destination_provider = destination_network && getProvider(destination_network, 'autofil')
    const destination_wallet = destination_provider?.activeWallet

    const destination_contract = destination_network?.contracts.find(c => destination_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address
    const source_contract = source_network?.contracts.find(c => source_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address

    useEffect(() => {
        let commitHandler: any = undefined;
        if (commitId) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!destination_provider)
                        throw new Error("No destination provider")

                    const data = await destination_provider.getDetails({
                        type: destination_asset?.contract ? 'erc20' : 'native',
                        chainId: destination_network.chain_id,
                        id: commitId,
                        contractAddress: destination_contract as `0x${string}`,
                    })
                    if (data) updateCommit('destinationDetails', { ...data, fetchedByLightClient: destinationDetails?.fetchedByLightClient })
                    if (data?.claimed == 3) {
                        clearInterval(commitHandler)
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [destination_network, sourceDetails])

    useEffect(() => {
        let commitHandler: any = undefined;
        if (commitId) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!source_provider)
                        throw new Error("No source provider")

                    const data = await source_provider.getDetails({
                        type: source_asset?.contract ? 'erc20' : 'native',
                        chainId: source_network.chain_id,
                        id: commitId,
                        contractAddress: source_contract as `0x${string}`,
                    })
                    if (data) updateCommit('sourceDetails', data)
                    if (data?.claimed == 3) {
                        clearInterval(commitHandler)
                        updateCommit('sourceDetails', {
                            ...data,
                            claimTime: !sourceDetails?.claimTime ? Date.now() : sourceDetails?.claimTime
                        })
                    }
                }, 5000)
            })()
        }
        return () => clearInterval(commitHandler)
    }, [source_network, destinationDetails])

    const handleClaimAssets = async () => {
        try {
            if (!destination_network) throw new Error("No source network")
            if (!commitId) throw new Error("No commitment details")
            if (!destinationDetails) throw new Error("No commitment")
            if (!destination_asset) throw new Error("No source asset")
            if (!destinationDetails?.secret) throw new Error("No secret")

            await source_provider?.claim({
                type: source_asset?.contract ? 'erc20' : 'native',
                id: commitId,
                secret: destinationDetails?.secret,
                chainId: destination_network.chain_id,
                contractAddress: destination_contract as `0x${string}`,
                sourceAsset: destination_asset,
            })

            updateCommit('manualClaimRequested', true)
        }
        catch (e) {
            updateCommit('error', e.details || e.message)
        }
    }

    return (
        <>
            {
                isManualClaimable
                    ? (
                        manualClaimRequested
                            ? <></>
                            : <WalletActionButton
                                activeChain={destination_wallet?.chainId}
                                isConnected={!!destination_wallet}
                                network={destination_network!}
                                networkChainId={Number(destination_network?.chain_id)}
                                onClick={handleClaimAssets}
                            >
                                Claim Manually
                            </WalletActionButton>
                    )
                    : <></>
            }
        </>
    )
}
