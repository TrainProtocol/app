import { FC, useEffect, useRef } from "react";
import { ContractType, Network, Token } from "../../../../Models/Network";
import { useAtomicState } from "../../../../context/atomicContext";
import useWallet from "../../../../hooks/useWallet";
import { WalletProvider } from "../../../../Models/WalletProvider";
import ActionStatus from "./Status/ActionStatus";

export const LpLockingAssets: FC = () => {
    const { destination_network, commitId, setDestinationDetails, destination_asset, lightClient, sourceDetails } = useAtomicState()
    const { provider } = useWallet(destination_network, 'autofil')
    const isLoading = useRef(false)

    const atomicContract = destination_network?.contracts.find(c => destination_asset?.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address

    const getDetails = async ({ provider, network, commitId, asset }: { provider: WalletProvider, network: Network, commitId: string, asset: Token }) => {
        if (!atomicContract) throw Error("No atomic contract")
        if (lightClient && !sourceDetails?.hashlock) {
            try {
                const destinationDetails = await lightClient.getHashlock({
                    network: network,
                    token: asset,
                    commitId,
                    atomicContract
                })
                if (destinationDetails) {
                    setDestinationDetails({ ...destinationDetails, fetchedByLightClient: true })
                    return
                }
            }
            catch (e) {
                console.log(e)
            }
        }

        let lockHandler: any = undefined
        lockHandler = setInterval(async () => {
            if (!network.chain_id)
                throw Error("No chain id")

            if (provider.secureGetDetails) {
                try {
                    const destiantionDetails = await provider.secureGetDetails({
                        type: asset?.contract ? 'erc20' : 'native',
                        chainId: network.chain_id,
                        id: commitId,
                        contractAddress: atomicContract as `0x${string}`,
                    })

                    if (destiantionDetails?.hashlock) {
                        setDestinationDetails({ ...destiantionDetails, fetchedByLightClient: false })
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
                chainId: network.chain_id,
                id: commitId,
                contractAddress: atomicContract as `0x${string}`,
            })

            if (destiantionDetails?.hashlock) {
                setDestinationDetails({ ...destiantionDetails, fetchedByLightClient: false })
                clearInterval(lockHandler)
            }

        }, 5000)

        return () => {
            lockHandler && clearInterval(lockHandler);
        };

    }

    useEffect(() => {
        (async () => {
            if (provider && destination_network && commitId && destination_asset && !isLoading.current) {
                isLoading.current = true
                await getDetails({ provider, network: destination_network, commitId, asset: destination_asset })
            }
        })()
    }, [provider, destination_network, commitId, isLoading])

    return <ActionStatus
        status="pending"
        title='Solver is locking assets'
    />
}