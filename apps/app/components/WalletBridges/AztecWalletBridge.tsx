import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useAztecWalletStore } from '@/stores/aztecWalletStore'
import { useWalletStore } from '@/stores/walletStore'
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

export function AztecWalletBridge() {
    const wallet = useAztecWalletStore(s => s.wallet)
    const connectedWallets = useWalletStore(s => s.connectedWallets)
    const getRpcUrl = useBridgeRpcUrl('aztec:')

    const aztecWallet = connectedWallets.find(w => w.providerName === 'Aztec')
    const address = aztecWallet?.address ?? null

    const adapter = useMemo<TrainWalletAdapter>(() => {
        return {
            chainNamespace: chainNamespace('aztec'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCPublicClient('aztec', {
                    rpcUrl: getRpcUrl(networkId),
                    signer: wallet && address ? { wallet, address } : undefined,
                })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, _address?: string) {
                if (!wallet || !address) throw new Error('No Aztec signer available')
                return sdk.createHTLCWalletClient('aztec', {
                    rpcUrl: getRpcUrl(networkId),
                    signer: { wallet, address },
                })
            },

            getLoginConfig: (_address?: string) => {
                if (!wallet || !address) return null
                return { wallet, address }
            },
        }
    }, [wallet, address, getRpcUrl])

    useRegisterWallet(adapter)
    return null
}
