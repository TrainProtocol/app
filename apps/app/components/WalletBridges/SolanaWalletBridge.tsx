import { useMemo } from 'react'
import { useRegisterWallet, type TrainWalletAdapter } from '@train-protocol/react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'

export function SolanaWalletBridge() {
    const { wallets } = useWallet()
    const { connection } = useConnection()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: 'solana',

        getSigner: () => {
            const connectedWallet = wallets.find(w => w.adapter.connected)
            const publicKey = connectedWallet?.adapter.publicKey
            if (!connectedWallet || !publicKey) return null

            return {
                address: publicKey.toBase58(),
                chainNamespace: 'solana',
                sendTransaction: async (tx) => {
                    return connectedWallet.adapter.sendTransaction(tx as any, connection)
                },
            }
        },

        getClientConfig: () => {
            const solanaNetwork = networks.find(n => n.caip2Id.startsWith('solana:'))
            if (!solanaNetwork) return {}
            const rpcUrl = getEffectiveRpcUrls(solanaNetwork)[0] ?? solanaNetwork.nodes?.[0]?.url ?? ''
            return { rpcUrl }
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
