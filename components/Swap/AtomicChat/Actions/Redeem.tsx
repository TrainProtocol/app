import { FC } from "react"
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import { WalletActionButton } from "../../buttons";
import { useRouter } from "next/router";
import KnownInternalNames from "../../../../lib/knownIds";
import useRedeemStatusPolling from "../../../../hooks/htlc/useRedeemStatusPolling";
import ButtonStatus from "./Status/ButtonStatus";

export const RedeemAction: FC = () => {
    const { destination_network, source_network, sourceDetails, destinationDetails, updateCommit, manualClaimRequested, destination_asset, source_asset, commitId, isManualClaimable, atomicQuery, setAtomicQuery, destAtomicContract, srcAtomicContract, address, commitFromApi } = useAtomicState()
    const isAztecDestination = destination_network?.name === KnownInternalNames.Networks.AztecTestnet;
    const router = useRouter()
    const { provider: destination_provider } = useWallet(destination_network, 'withdrawal')
    const destination_wallet = destination_provider?.activeWallet

    // Poll for destination chain redeem/claim status using SWR
    useRedeemStatusPolling({
        network: destination_network,
        commitId: commitId,
        contractAddress: destAtomicContract,
        asset: destination_asset,
        onStatusUpdate: (details) => {
            updateCommit('destinationDetails', details)
        }
    })

    // Poll for source chain redeem/claim status using SWR
    useRedeemStatusPolling({
        network: source_network,
        commitId: commitId,
        contractAddress: srcAtomicContract,
        asset: source_asset,
        onStatusUpdate: (details) => {
            // Record claim time when claim is detected
            if (details?.claimed === 3) {
                updateCommit('sourceDetails', {
                    ...details,
                    claimTime: !sourceDetails?.claimTime ? Date.now() : sourceDetails?.claimTime
                })
            } else {
                updateCommit('sourceDetails', details)
            }
        }
    })

    const handleClaimAssets = async () => {
        try {
            if (!destination_network) throw new Error("No source network")
            if (!commitId) throw new Error("No commitment details")
            if (!destinationDetails) throw new Error("No commitment")
            if (!destination_asset) throw new Error("No source asset")
            if (!sourceDetails?.secret) throw new Error("No secret")

            const claimTx = await destination_provider?.claim({
                type: destination_asset?.contract ? 'erc20' : 'native',
                id: commitId,
                secret: sourceDetails?.secret,
                chainId: destination_network.chainId,
                contractAddress: destAtomicContract as `0x${string}`,
                sourceAsset: destination_asset,
                destLpAddress: commitFromApi?.destinationSolverAddress || '',
                destinationAddress: address,
                destinationAsset: destination_asset
            })

            setAtomicQuery({ ...atomicQuery, claimTxId: claimTx })

            const basePath = router?.basePath || ""
            var atomicURL = window.location.protocol + "//"
                + window.location.host + `${basePath}/swap`;
            const atomicParams = new URLSearchParams({ ...atomicQuery, commitId, claimTxId: claimTx })
            if (atomicParams) {
                atomicURL += `?${atomicParams}`
            }
            window.history.replaceState({ ...window.history.state, as: atomicURL, url: atomicURL }, '', atomicURL);

            updateCommit('manualClaimRequested', true)
        }
        catch (e) {
            updateCommit('error', { message: e.details || e.message })
        }
    }

    return (
        <>
            {
                isManualClaimable
                    ? (
                        manualClaimRequested
                            ? null
                            : 
                            sourceDetails?.secret?
                            <WalletActionButton
                                activeChain={destination_wallet?.chainId}
                                isConnected={!!destination_wallet}
                                network={destination_network!}
                                networkChainId={Number(destination_network?.chainId)}
                                onClick={handleClaimAssets}
                            >
                                {isAztecDestination ? 'Claim' : 'Claim Manually'}
                            </WalletActionButton>
                            :
                            <ButtonStatus
                                isDisabled={true}
                                isLoading={true}
                            >
                                Claim
                            </ButtonStatus>
                    )
                    : null
            }
        </>
    )
}
