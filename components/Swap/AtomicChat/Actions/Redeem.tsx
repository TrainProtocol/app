import { FC, useEffect, useState } from "react"
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import ActionStatus from "./Status/ActionStatus";
import { WalletActionButton } from "../../buttons";
import { TriangleAlert } from "lucide-react";
import { ContractType } from "../../../../Models/Network";
import { CommitTransaction } from "../../../../lib/layerSwapApiClient";

export const RedeemAction: FC = () => {
    const { destination_network, source_network, sourceDetails, destinationDetails, updateCommit, destination_asset, source_asset, commitId, commitFromApi } = useAtomicState()
    const [requestedManualClaim, setRequestedManualClaim] = useState(false)
    const [sourceClaimTime, setSourceClaimTime] = useState<number | undefined>(undefined)
    const { getProvider } = useWallet()

    const source_provider = source_network && getProvider(source_network, 'withdrawal')
    const destination_provider = destination_network && getProvider(destination_network, 'autofil')
    const destination_wallet = destination_provider?.activeWallet

    const destination_contract = destination_network?.contracts.find(c => destination_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address
    const source_contract = source_network?.contracts.find(c => source_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address

    const userLockTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)
    const assetsLocked = ((sourceDetails?.hashlock && destinationDetails?.hashlock) || !!userLockTransaction) ? true : false;

    const isManualClaimable = !!(assetsLocked && sourceDetails?.claimed == 3 && destinationDetails?.claimed != 3 && (sourceClaimTime && (Date.now() - sourceClaimTime > 30000)))

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
                    if (data) updateCommit('destinationDetails', data)
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
                        if (!sourceClaimTime) setSourceClaimTime(Date.now())
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

            setRequestedManualClaim(true)
        }
        catch (e) {
            updateCommit('error', e.details || e.message)
        }
    }

    return (
        <>
            {
                isManualClaimable
                    ? (requestedManualClaim
                        ? <ActionStatus
                            status="pending"
                            title='Assets are currently being released'
                        />
                        : <div className="space-y-2">
                            <div className="inline-flex text-secondary-text">
                                <TriangleAlert className="w-6 h-6" />
                                <p className="p- text-center">
                                    The solver was unable to release your funds. Please claim them manually.
                                </p>
                            </div>
                            <WalletActionButton
                                activeChain={destination_wallet?.chainId}
                                isConnected={!!destination_wallet}
                                network={destination_network!}
                                networkChainId={Number(destination_network?.chain_id)}
                                onClick={handleClaimAssets}
                            >
                                Claim Manually
                            </WalletActionButton>
                        </div>)
                    : <></>
            }
        </>
    )
}
