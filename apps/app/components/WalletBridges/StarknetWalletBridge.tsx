import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useAccount } from '@starknet-react/core'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'

export function StarknetWalletBridge() {
    const { account, address } = useAccount()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: chainNamespace('starknet'),

        createClient(sdk: TrainSDK, networkId: Caip2Id) {
            const starknetNetwork = networks.find(n => n.caip2Id.startsWith('starknet:'))
            const rpcUrl = (starknetNetwork ? getEffectiveRpcUrls(starknetNetwork)[0] ?? starknetNetwork.nodes?.[0]?.url : '')
                ?? ''
            return sdk.createHTLCClient('starknet', { rpcUrl })
        },

        createWriteClient(sdk: TrainSDK, networkId: Caip2Id) {
            const starknetNetwork = networks.find(n => n.caip2Id.startsWith('starknet:'))
            const rpcUrl = (starknetNetwork ? getEffectiveRpcUrls(starknetNetwork)[0] ?? starknetNetwork.nodes?.[0]?.url : '')
                ?? ''
            return sdk.createHTLCClient('starknet', {
                rpcUrl,
                signer: address && account ? { address, account } : undefined,
            })
        },

        getLoginConfig: () => {
            if (!account || !address) return null
            const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'
            return {
                provider: account,
                address,
                options: { chainId: isSandbox ? 'SN_SEPOLIA' : 'SN_MAIN' },
            }
        },

    }), [account, address, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
