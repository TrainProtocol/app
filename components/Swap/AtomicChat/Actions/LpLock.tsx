import { FC, useEffect, useState } from "react";
import { Network, Token } from "../../../../Models/Network";
import { useAtomicState } from "../../../../context/atomicContext";
import useWallet from "../../../../hooks/useWallet";
import { WalletProvider } from "../../../../Models/WalletProvider";
import ButtonStatus from "./Status/ButtonStatus";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, updateCommit, destination_asset, commitFromApi, destAtomicContract } = useAtomicState()
    const { provider } = useWallet(destination_network, 'autofil')
    const [loading, setLoading] = useState(false)

    const getDetails = async ({ provider, network, commitId, asset }: { provider: WalletProvider, network: Network, commitId: string, asset: Token }) => {
        if (!destAtomicContract) throw Error("No atomic contract")

        let lockHandler: any = undefined
        lockHandler = setInterval(async () => {
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
                        clearInterval(lockHandler)
                    }
                    return
                }
                catch (e) {
                    clearInterval(lockHandler)
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
                clearInterval(lockHandler)
            }

        }, 5000)

        return () => {
            lockHandler && clearInterval(lockHandler);
        };

    }

    useEffect(() => {
        (async () => {
            if (provider && destination_network && commitId && destination_asset && !loading) {
                setLoading(true)
                getDetails({ provider, network: destination_network, commitId, asset: destination_asset })
            }
        })()
    }, [provider, destination_network, commitId, loading, destAtomicContract])


    return <ButtonStatus
        isDisabled={true}
    >
        Locking assets
    </ButtonStatus>
}