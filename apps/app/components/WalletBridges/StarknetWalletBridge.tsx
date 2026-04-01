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

    const adapter = useMemo<TrainWalletAdapter>(() => {
        function getRpcUrl(): string {
            const starknetNetwork = networks.find(n => n.caip2Id.startsWith('starknet:'))
            return (starknetNetwork ? getEffectiveRpcUrls(starknetNetwork)[0] ?? starknetNetwork.nodes?.[0]?.url : '') ?? ''
        }

        return {
            chainNamespace: chainNamespace('starknet'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCClient('starknet', { rpcUrl: getRpcUrl() })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, _address?: string) {
                return sdk.createHTLCClient('starknet', {
                    rpcUrl: getRpcUrl(),
                    signer: address && account ? { address, account } : undefined,
                })
            },

            getLoginConfig: (_address?: string) => {
                if (!account || !address) return null
                const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'
                return {
                    provider: account,
                    address,
                    options: { chainId: isSandbox ? 'SN_SEPOLIA' : 'SN_MAIN' },
                }
            },
        }
    }, [account, address, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
