import { useMemo } from 'react'
import { useNetworks, useRegisterWallet, useSwapStoreRead, type TrainWalletAdapter } from '@train-protocol/react'
import { useAccount, useChainId, useConfig } from 'wagmi'
import { getWalletClient, getConnections } from 'wagmi/actions'

/**
 * Bridges wagmi wallet to Train Protocol's wallet adapter system.
 * Renders nothing — just registers the EVM adapter (signing, RPC, and login).
 */
export function EvmWalletBridge() {
    const config = useConfig()
    const { getCurrentSwapData } = useSwapStoreRead()
    const { networks } = useNetworks()
    const { address: connectedAddress } = useAccount()
    const currentChainId = useChainId()

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: 'eip155',

        getSigner: () => {
            if (!connectedAddress) return null

            const swap = getCurrentSwapData()
            const sourceNetworkId = swap?.source
            if (!sourceNetworkId?.startsWith('eip155:')) return null

            const chainId = Number(sourceNetworkId.split(':')[1])

            return {
                address: connectedAddress,
                chainNamespace: 'eip155',
                sendTransaction: async (tx) => {
                    const connection = getConnections(config)
                        .find(c => c.accounts.some(a => a.toLowerCase() === connectedAddress.toLowerCase()))

                    const walletClient = await getWalletClient(config, {
                        chainId,
                        account: connectedAddress as `0x${string}`,
                        connector: connection?.connector,
                    })

                    return await walletClient.sendTransaction({
                        to: tx.to as `0x${string}`,
                        data: tx.data as `0x${string}`,
                        value: tx.value,
                        account: walletClient.account,
                    })
                },
            }
        },

        getClientConfig: () => {
            const network = networks.find(n => n.caip2Id.includes('eip155')) ///TODO maybe better filter
            const rpcUrl = network?.nodes[0].url
            if (!rpcUrl) {
                throw new Error('No RPC url for eip155')
            }
            return { rpcUrl }
        },

        getSignerForNetwork: (caip2Id: string) => {
            if (!connectedAddress) return null

            const chainId = Number(caip2Id.split(':')[1])

            return {
                address: connectedAddress,
                chainNamespace: 'eip155',
                sendTransaction: async (tx) => {
                    const connection = getConnections(config)
                        .find(c => c.accounts.some(a => a.toLowerCase() === connectedAddress.toLowerCase()))

                    const walletClient = await getWalletClient(config, {
                        chainId,
                        account: connectedAddress as `0x${string}`,
                        connector: connection?.connector,
                    })

                    return await walletClient.sendTransaction({
                        to: tx.to as `0x${string}`,
                        data: tx.data as `0x${string}`,
                        value: tx.value,
                        account: walletClient.account,
                    })
                },
            }
        },

        getClientConfigForNetwork: (caip2Id: string) => {
            const network = networks.find(n => n.caip2Id === caip2Id)
            const rpcUrl = network?.nodes[0].url
            if (!rpcUrl) return {}
            return { rpcUrl }
        },

        getLoginConfig: async () => {
            if (!connectedAddress) return null
            const connections = getConnections(config)
            if (connections.length === 0) return null

            const provider = await connections[0].connector.getProvider()
            const sandbox = currentChainId !== 1
            return {
                provider,
                address: connectedAddress,
                options: { sandbox, currentChainId },
            }
        },

        onSignerChange: () => () => { },
    }), [config, getCurrentSwapData, networks, connectedAddress, currentChainId])

    useRegisterWallet(adapter)
    return null
}
