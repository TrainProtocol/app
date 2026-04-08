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
        function getRpcUrl(caip2Id?: Caip2Id): string {
            const network = networks.find(n =>
                caip2Id
                    ? n.caip2Id === (caip2Id as string)
                    : n.caip2Id.startsWith('aztec:')
            )
            if (!network) return ''
            return getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''
        }

        return {
            chainNamespace: chainNamespace('aztec'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCClient('aztec', { rpcUrl: getRpcUrl(networkId) })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, _address?: string) {
                return sdk.createHTLCClient('aztec', {
                    rpcUrl: getRpcUrl(networkId),
                    signer: wallet && address ? { wallet, address } : undefined,
                })
            },

            getLoginConfig: (_address?: string) => {
                if (!wallet || !address) return null
                return { wallet, address }
            },
        }
    }, [wallet, address, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
