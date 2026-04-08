import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import useWallet from '@/hooks/useWallet'

export function StarknetWalletBridge() {
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)
    const { providers } = useWallet()
    const starknetWalletProvider = providers.find(p => p.id == 'starknet')

    const adapter = useMemo<TrainWalletAdapter>(() => {
        function getRpcUrl(): string {
            const starknetNetwork = networks.find(n => n.caip2Id.startsWith('starknet:'))
            return (starknetNetwork ? getEffectiveRpcUrls(starknetNetwork)[0] ?? starknetNetwork.nodes?.[0]?.url : '') ?? ''
        }

        return {
            chainNamespace: chainNamespace('starknet'),

            createClient(sdk: TrainSDK) {
                return sdk.createHTLCClient('starknet', { rpcUrl: getRpcUrl() })
            },

            createWriteClient(sdk: TrainSDK, _address?: string) {
                const starknetAccount = starknetWalletProvider?.activeWallet?.metadata?.starknetAccount

                return sdk.createHTLCClient('starknet', {
                    rpcUrl: getRpcUrl(),
                    signer: starknetAccount ? { address: starknetAccount.address, account: starknetAccount } : undefined,
                })
            },

            getLoginConfig: (_address?: string) => {
                const starknetAccount = starknetWalletProvider?.activeWallet?.metadata?.starknetAccount

                if (!starknetAccount) return null
                const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'
                return {
                    provider: starknetAccount,
                    address: starknetAccount.address,
                    options: { chainId: isSandbox ? 'SN_SEPOLIA' : 'SN_MAIN' },
                }
            },
        }
    }, [starknetWalletProvider, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}