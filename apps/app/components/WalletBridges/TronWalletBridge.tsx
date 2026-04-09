import { useMemo, useRef } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks'
import type { TronSigner, TronUnsignedTransaction } from '@train-protocol/tron'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'

export function TronWalletBridge() {
    const { wallet: tronWallet } = useWallet()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    // Use a ref to access the wallet lazily inside callbacks,
    // avoiding tronWallet in useMemo deps (new object ref each render).
    const walletRef = useRef(tronWallet)
    walletRef.current = tronWallet

    const adapter = useMemo<TrainWalletAdapter>(() => {

        function getSignerForNetwork(rpcUrl: string): TronSigner | null {
            const tronAdapter = walletRef.current?.adapter
            if (!tronAdapter?.connected || !tronAdapter.address) return null

            return {
                address: tronAdapter.address,
                async signAndBroadcast(unsignedTx: TronUnsignedTransaction): Promise<string> {
                    const signedTx = await tronAdapter.signTransaction(unsignedTx as any)

                    const response = await fetch(`${rpcUrl}/wallet/broadcasttransaction`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(signedTx),
                    })
                    const result = await response.json() as { result?: boolean; txid?: string }
                    if (!result.result) {
                        throw new Error('Failed to broadcast transaction')
                    }
                    return result.txid ?? unsignedTx.txID
                },
            }
        }

        function getRpcUrl(caip2Id?: Caip2Id): string {
            const network = networks.find(n =>
                caip2Id
                    ? n.caip2Id === (caip2Id as string)
                    : n.caip2Id?.toLowerCase().startsWith('tron')
            )
            if (!network) return ''
            return getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''
        }

        return {
            chainNamespace: chainNamespace('tron'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                const rpcUrl = getRpcUrl(networkId)
                return sdk.createHTLCPublicClient('tron', { rpcUrl })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id) {
                const rpcUrl = getRpcUrl(networkId)
                const signer = getSignerForNetwork(rpcUrl)
                if (!signer) throw new Error('No Tron signer available')
                return sdk.createHTLCWalletClient('tron', { rpcUrl, signer })
            },

            getLoginConfig: async () => {
                const tronAdapter = walletRef.current?.adapter
                if (!tronAdapter?.connected || !tronAdapter.address) return null

                return {
                    wallet: {
                        signMessage: (message: string) => tronAdapter.signMessage(message),
                    },
                }
            },
        }
    }, [networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
