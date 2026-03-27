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

export function SolanaWalletBridge() {
    const { wallets } = useWallet()
    const { connection } = useConnection()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: chainNamespace('solana'),

        createClient(sdk: TrainSDK, networkId: Caip2Id) {
            const solanaNetwork = networks.find(n => n.caip2Id.startsWith('solana:'))
            const rpcUrl = (solanaNetwork ? getEffectiveRpcUrls(solanaNetwork)[0] ?? solanaNetwork.nodes?.[0]?.url : '')
                ?? ''
            return sdk.createHTLCClient('solana', { rpcUrl })
        },

        createWriteClient(sdk: TrainSDK, networkId: Caip2Id) {
            const solanaNetwork = networks.find(n => n.caip2Id.startsWith('solana:'))
            const rpcUrl = (solanaNetwork ? getEffectiveRpcUrls(solanaNetwork)[0] ?? solanaNetwork.nodes?.[0]?.url : '')
                ?? ''
            const connectedWallet = wallets.find(w => w.adapter.connected)
            const publicKey = connectedWallet?.adapter.publicKey

            const signer = (connectedWallet && publicKey) ? {
                publicKey: publicKey.toBase58(),
                sendTransaction: async (tx: any) => {
                    return connectedWallet.adapter.sendTransaction(tx, connection)
                },
            } : undefined

            return sdk.createHTLCClient('solana', { rpcUrl, signer })
        },

        getLoginConfig: () => {
            const connectedAdapter = wallets.find(w => w.adapter.connected)?.adapter
            const signMessage = connectedAdapter && 'signMessage' in connectedAdapter
                ? (msg: Uint8Array) => connectedAdapter.signMessage(msg)
                : undefined
            if (!signMessage) return null
            return { wallet: { signMessage } }
        },

    }), [wallets, connection, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
