import { useMemo } from 'react'
import { useRegisterWallet, type TrainWalletAdapter } from '@train-protocol/react'
import { useAztecWalletContext } from '@/components/WalletProviders/AztecWalletProvider'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'

export function AztecWalletBridge() {
    const { wallet, accountAddress } = useAztecWalletContext()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: 'aztec',

        getSigner: () => {
            if (!wallet || !accountAddress) return null

            return {
                address: accountAddress,
                chainNamespace: 'aztec',
                sendTransaction: async () => {
                    // Aztec uses its own wallet SDK, not raw sendTransaction
                    throw new Error('Aztec uses wallet SDK, not sendTransaction')
                },
            }
        },

        getClientConfig: () => {
            const aztecNetwork = networks.find(n => n.caip2Id.startsWith('aztec:'))
            if (!aztecNetwork) return {}
            const rpcUrl = getEffectiveRpcUrls(aztecNetwork)[0] ?? aztecNetwork.nodes?.[0]?.url ?? ''
            return {
                rpcUrl,
                signer: wallet && accountAddress ? { wallet, address: accountAddress } : undefined,
            }
        },

        onSignerChange: () => {
            return () => {}
        },
    }), [wallet, accountAddress, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
