import { FC, useEffect, useState } from "react";
import { ContractType, Network, Token } from "../../../../Models/Network";
import { useAtomicState } from "../../../../context/atomicContext";
import useWallet from "../../../../hooks/useWallet";
import { WalletProvider } from "../../../../Models/WalletProvider";
import ButtonStatus from "./Status/ButtonStatus";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, updateCommit, destination_asset, lightClient, sourceDetails, setVerifyingByLightClient } = useAtomicState()
    const { provider } = useWallet(destination_network, 'autofil')
    const [loading, setLoading] = useState(false)

    const atomicContract = destination_network?.contracts.find(c => destination_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address

    const getDetails = async ({ provider, network, commitId, asset }: { provider: WalletProvider, network: Network, commitId: string, asset: Token }) => {
        if (!atomicContract) throw Error("No atomic contract")

        let lockHandler: any = undefined
        lockHandler = setInterval(async () => {
            if (provider.secureGetDetails) {
                try {
                    const destiantionDetails = await provider.secureGetDetails({
                        type: asset?.contract ? 'erc20' : 'native',
                        chainId: network.chainId,
                        id: commitId,
                        contractAddress: atomicContract as `0x${string}`,
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
                contractAddress: atomicContract as `0x${string}`,
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
                if (lightClient && !sourceDetails?.hashlock && atomicContract) {
                    try {
                        setVerifyingByLightClient(true)
                        const data = await lightClient.getHashlock({
                            network: destination_network,
                            token: destination_asset,
                            commitId,
                            atomicContract
                        })
                        if (data) {
                            updateCommit('destinationDetailsByLightClient', data)
                            return
                        }
                    }
                    catch (e) {
                        updateCommit('destinationDetailsByLightClient', { data: undefined, error: 'Light client is not available' })
                        console.log(e)
                    }
                    finally {
                        setVerifyingByLightClient(false)
                    }
                }
            }
        })()
    }, [provider, destination_network, commitId, loading, atomicContract])

    return <ButtonStatus
        isDisabled={true}
    >
        Locking assets
    </ButtonStatus>
}