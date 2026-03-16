import { useMemo } from 'react'
import { useRegisterWallet, type TrainWalletAdapter } from '@train-protocol/react'
import { useAccount } from '@starknet-react/core'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'

export function StarknetWalletBridge() {
    const { account, address } = useAccount()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: 'starknet',

        getSigner: () => {
            if (!address || !account) return null

            return {
                address,
                chainNamespace: 'starknet',
                sendTransaction: async () => {
                    // Starknet uses multicall via account.execute, not raw sendTransaction
                    // The StarknetHTLCClient uses signer.account directly
                    throw new Error('Starknet uses account.execute, not sendTransaction')
                },
            }
        },

        getClientConfig: () => {
            const starknetNetwork = networks.find(n => n.caip2Id.startsWith('starknet:'))
            if (!starknetNetwork) return {}
            const rpcUrl = getEffectiveRpcUrls(starknetNetwork)[0] ?? starknetNetwork.nodes?.[0]?.url ?? ''
            return {
                rpcUrl,
                signer: address && account ? { address, account } : undefined,
            }
        },

        onSignerChange: () => {
            return () => {}
        },
    }), [account, address, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
