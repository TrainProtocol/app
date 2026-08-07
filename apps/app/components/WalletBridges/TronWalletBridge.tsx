import { useMemo } from 'react'
import { useRegisterWallet, chainNamespace, type TrainWalletAdapter, type Caip2Id, } from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import type { TronSigner, TronUnsignedTransaction } from '@train-protocol/tron'
import { tronAdapterManager } from '@layerswap/wallet-tron'
import { Address } from '@/lib/address'
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

type TronSignerAdapter = { signMessage?: (message: string) => Promise<string> }

export function TronWalletBridge() {
    const getRpcUrl = useBridgeRpcUrl('tron')

    const adapter = useMemo<TrainWalletAdapter>(() => {

        function getSignerForNetwork(rpcUrl: string, requestedAddress?: string): TronSigner | null {
            const tronAdapter = tronAdapterManager.getActiveAdapter()
            if (!tronAdapter?.connected || !tronAdapter.address) return null
            if (requestedAddress && !Address.equals(tronAdapter.address, requestedAddress, null, 'tron')) return null

            return {
                address: tronAdapter.address,
                async signAndBroadcast(unsignedTx: TronUnsignedTransaction): Promise<string> {
                    const signedTx = await tronAdapter.signTransaction(unsignedTx)

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

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, address?: string) {
                const rpcUrl = getRpcUrl(networkId)
                const signer = getSignerForNetwork(rpcUrl, address)
                if (!signer) throw new Error('No Tron signer available')
                return sdk.createHTLCWalletClient('tron', { rpcUrl, signer })
            },

            getLoginConfig: async (address?: string) => {
                const tronAdapter = tronAdapterManager.getActiveAdapter()
                if (!tronAdapter?.connected || !tronAdapter.address) return null
                if (address && !Address.equals(tronAdapter.address, address, null, 'tron')) return null
                const signMessage = (tronAdapter as TronSignerAdapter).signMessage
                if (!signMessage) return null

                return { wallet: { signMessage: (message: string) => signMessage.call(tronAdapter, message) } }
            },
        }
    }, [getRpcUrl])

    useRegisterWallet(adapter)
    return null
}