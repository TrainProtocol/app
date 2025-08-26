import { FC, useEffect } from "react"
import useWallet from "../../../../hooks/useWallet";
import { useAtomicState } from "../../../../context/atomicContext";
import { WalletActionButton } from "../../buttons";
import { useRouter } from "next/router";
import KnownInternalNames from "../../../../lib/knownIds";

export const RedeemAction: FC = () => {
    const { destination_network, source_network, sourceDetails, destinationDetails, updateCommit, manualClaimRequested, destination_asset, source_asset, commitId, isManualClaimable, atomicQuery, setAtomicQuery, destAtomicContract, srcAtomicContract } = useAtomicState()
    const isAztecDestination = destination_network?.name === KnownInternalNames.Networks.AztecTestnet;
    const { getProvider } = useWallet()
    const router = useRouter()
    const source_provider = source_network && getProvider(source_network, 'withdrawal')
    const destination_provider = destination_network && getProvider(destination_network, 'withdrawal')
    const destination_wallet = destination_provider?.activeWallet

    useEffect(() => {
        let commitHandler: any = undefined;
        if (commitId) {
            (async () => {
                commitHandler = setInterval(async () => {
                    if (!destination_provider)
                        throw new Error("No destination provider")

                    const data = await destination_provider.getDetails({
                        type: destination_asset?.contract ? 'erc20' : 'native',
                        chainId: destination_network.chainId,
                        id: commitId,
                        contractAddress: destAtomicContract as `0x${string}`,
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
                        chainId: source_network.chainId,
                        id: commitId,
                        contractAddress: srcAtomicContract as `0x${string}`,
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
            if (!sourceDetails?.secret) throw new Error("No secret")

            const claimTx = await destination_provider?.claim({
                type: destination_asset?.contract ? 'erc20' : 'native',
                id: commitId,
                secret: sourceDetails?.secret,
                chainId: destination_network.chainId,
                contractAddress: destAtomicContract as `0x${string}`,
                sourceAsset: destination_asset,
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
                            : <WalletActionButton
                                activeChain={destination_wallet?.chainId}
                                isConnected={!!destination_wallet}
                                network={destination_network!}
                                networkChainId={Number(destination_network?.chainId)}
                                onClick={handleClaimAssets}
                            >
                                {isAztecDestination ? 'Claim' : 'Claim Manually'}
                            </WalletActionButton>
                    )
                    : null
            }
        </>
    )
}
