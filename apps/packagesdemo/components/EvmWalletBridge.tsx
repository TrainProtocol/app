import { useMemo } from 'react'
import { useNetworks, useRegisterWallet, useStoreContext, type TrainWalletAdapter } from '@train-protocol/react'
import { useAccount, useChainId, useConfig } from 'wagmi'
import { getWalletClient, getConnections } from 'wagmi/actions'

/**
 * Bridges wagmi wallet to Train Protocol's wallet adapter system.
 * Renders nothing — just registers the EVM adapter (signing, RPC, and login).
 */
export function EvmWalletBridge() {
    const config = useConfig()
    const store = useStoreContext()
    const { networks } = useNetworks()
    const { address: connectedAddress } = useAccount()
    const currentChainId = useChainId()

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: 'eip155',

        getSigner: () => {
            const state = store?.getState()
            const swap = state?.currentSwap
                ?? (state?.activeHashlock ? state.swaps[state.activeHashlock] : null)
            const sourceNetworkId = swap?.source
            if (!sourceNetworkId?.startsWith('eip155:')) return null

            const address = swap?.address
            if (!address) return null

            const chainId = Number(sourceNetworkId.split(':')[1])

            return {
                address,
                chainNamespace: 'eip155',
                sendTransaction: async (tx) => {
                    const connection = getConnections(config)
                        .find(c => c.accounts.some(a => a.toLowerCase() === address.toLowerCase()))

                    const walletClient = await getWalletClient(config, {
                        chainId,
                        account: address as `0x${string}`,
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
    }), [config, store, networks, connectedAddress, currentChainId])

    useRegisterWallet(adapter)
    return null
}
