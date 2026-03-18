import { AztecWalletBridge as AztecBridge } from '@train-protocol/react'
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

    const aztecNetwork = networks.find(n => n.caip2Id.startsWith('aztec:'))
    const rpcUrl = aztecNetwork
        ? getEffectiveRpcUrls(aztecNetwork)[0] ?? aztecNetwork.nodes?.[0]?.url
        : undefined

    return <AztecBridge wallet={wallet} address={address} rpcUrl={rpcUrl} />
}
