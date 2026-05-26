import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import { Address } from '@/lib/address'

export function SolanaWalletBridge() {
    const { wallets } = useWallet()
    const { connection } = useConnection()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => {
        function getRpcUrl(caip2Id?: Caip2Id): string {
            const network = networks.find(n =>
                caip2Id
                    ? n.caip2Id === (caip2Id as string)
                    : n.caip2Id.startsWith('solana:')
            )
            if (!network) return ''
            return getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''
        }

        return {
            chainNamespace: chainNamespace('solana'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCPublicClient('solana', { rpcUrl: getRpcUrl(networkId) })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, address?: string) {
                const rpcUrl = getRpcUrl(networkId)
                const connectedWallet = address
                    ? wallets.find(w => w.adapter.connected && w.adapter.publicKey?.toBase58() === address)
                    : wallets.find(w => w.adapter.connected)

                if (address && !connectedWallet) {
                    throw new Error(`No connected Solana wallet found for address "${address}"`)
                }

                const publicKey = connectedWallet?.adapter.publicKey

                if (!connectedWallet || !publicKey) throw new Error('No Solana signer available')

                const signer = {
                    publicKey: publicKey.toBase58(),
                    sendTransaction: async (tx: any) => {
                        return connectedWallet.adapter.sendTransaction(tx, connection)
                    },
                }

                return sdk.createHTLCWalletClient('solana', { rpcUrl, signer })
            },

            getLoginConfig: (address?: string) => {
                const connectedAdapter = address
                    ? wallets.find(w => w.adapter.connected && w.adapter.publicKey && Address.equals(w.adapter.publicKey?.toBase58(), address, null, 'solana'))?.adapter
                    : wallets.find(w => w.adapter.connected)?.adapter
                const signMessage = connectedAdapter && 'signMessage' in connectedAdapter
                    ? (msg: Uint8Array) => (connectedAdapter as any).signMessage(msg)
                    : undefined
                if (!signMessage) return null
                return { wallet: { signMessage } }
            },
        }
    }, [wallets, connection, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
