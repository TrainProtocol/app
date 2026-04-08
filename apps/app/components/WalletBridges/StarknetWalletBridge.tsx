import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
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
        function getRpcUrl(caip2Id?: Caip2Id): string {
            const network = networks.find(n =>
                caip2Id
                    ? n.caip2Id === (caip2Id as string)
                    : n.caip2Id.startsWith('starknet:')
            )
            if (!network) return ''
            return getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''
        }

        return {
            chainNamespace: chainNamespace('starknet'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCClient('starknet', { rpcUrl: getRpcUrl(networkId) })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, _address?: string) {
                const starknetAccount = starknetWalletProvider?.activeWallet?.metadata?.starknetAccount

                return sdk.createHTLCClient('starknet', {
                    rpcUrl: getRpcUrl(networkId),
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