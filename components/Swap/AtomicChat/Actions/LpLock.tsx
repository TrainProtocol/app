import { FC, useEffect, useState } from "react";
import { Network, Token } from "../../../../Models/Network";
import { useAtomicState } from "../../../../context/atomicContext";
import useWallet from "../../../../hooks/useWallet";
import { WalletProvider } from "../../../../Models/WalletProvider";
import ButtonStatus from "./Status/ButtonStatus";
import sleep from "../../../../lib/wallets/utils/sleep";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, updateCommit, destination_asset, destAtomicContract } = useAtomicState()
    const { provider } = useWallet(destination_network, 'withdrawal')
    const [loading, setLoading] = useState(false)

    const getDetails = async ({ provider, network, commitId, asset, destAtomicContract }: { provider: WalletProvider, network: Network, commitId: string, asset: Token, destAtomicContract: string }) => {
        if (!destAtomicContract) throw Error("No atomic contract")

        const pollForDetails = async (): Promise<void> => {
            try {
                if (provider.secureGetDetails) {
                    try {
                        const destiantionDetails = await provider.secureGetDetails({
                            type: asset?.contract ? 'erc20' : 'native',
                            chainId: network.chainId,
                            id: commitId,
                            contractAddress: destAtomicContract as `0x${string}`,
                        })

                        if (destiantionDetails?.hashlock) {
                            updateCommit('destinationDetails', destiantionDetails)
                            return
                        }
                    }
                    catch (e) {
                        console.log(e)
                    }
                }

                const destiantionDetails = await provider.getDetails({
                    type: asset?.contract ? 'erc20' : 'native',
                    chainId: network.chainId,
                    id: commitId,
                    contractAddress: destAtomicContract as `0x${string}`,
                })

                if (destiantionDetails?.hashlock) {
                    updateCommit('destinationDetails', destiantionDetails)
                    return
                }

                await sleep(3000)
                await pollForDetails()
            } catch (error) {
                await sleep(3000)
                console.log(error)
                await pollForDetails()
            }
        }

        await pollForDetails()
    }

    useEffect(() => {
        (async () => {
            if (provider && destination_network && commitId && destination_asset && !loading && destAtomicContract) {
                setLoading(true)
                getDetails({ provider, network: destination_network, commitId, asset: destination_asset, destAtomicContract })
            }
        })()
    }, [provider, destination_network, commitId, loading, destAtomicContract])


    return <ButtonStatus
        isDisabled={true}
    >
        Locking assets
    </ButtonStatus>
}