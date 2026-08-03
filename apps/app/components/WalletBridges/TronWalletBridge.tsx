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
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

export function TronWalletBridge() {
    const { wallet: tronWallet } = useWallet()
    const getRpcUrl = useBridgeRpcUrl('tron')

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
    }, [getRpcUrl])

    useRegisterWallet(adapter)
    return null
}
