import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useAztecWalletStore } from '@/stores/aztecWalletStore'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import { useWalletStore } from '@/stores/walletStore'

export function AztecWalletBridge() {
    const wallet = useAztecWalletStore(s => s.wallet)
    const connectedWallets = useWalletStore(s => s.connectedWallets)
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const aztecWallet = connectedWallets.find(w => w.providerName === 'Aztec')
    const address = aztecWallet?.address ?? null

    const adapter = useMemo<TrainWalletAdapter>(() => {
        function getRpcUrl(): string {
            const aztecNetwork = networks.find(n => n.caip2Id.startsWith('aztec:'))
            return (aztecNetwork ? getEffectiveRpcUrls(aztecNetwork)[0] ?? aztecNetwork.nodes?.[0]?.url : '') ?? ''
        }

        return {
            chainNamespace: chainNamespace('aztec'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCClient('aztec', { rpcUrl: getRpcUrl() })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCClient('aztec', {
                    rpcUrl: getRpcUrl(),
                    signer: wallet && address ? { wallet, address } : undefined,
                })
            },

            getLoginConfig: () => {
                if (!wallet || !address) return null
                return { wallet, address }
            },
        }
    }, [wallet, address, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
