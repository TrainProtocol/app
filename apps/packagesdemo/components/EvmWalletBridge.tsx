import { useMemo } from 'react'
import { useRegisterWallet, useStoreContext, type TrainWalletAdapter } from '@train-protocol/react'
import { useConfig } from 'wagmi'
import { getWalletClient, getConnections } from 'wagmi/actions'

/**
 * Bridges wagmi wallet to Train Protocol's wallet adapter system.
 * Renders nothing — just registers the EVM adapter.
 */
export function EvmWalletBridge() {
    const config = useConfig()
    const store = useStoreContext()

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
            return { rpcUrl: '' }
        },

        onSignerChange: () => () => {},
    }), [config, store])

    useRegisterWallet(adapter)
    return null
}
