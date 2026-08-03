import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import useWallet from '@/hooks/useWallet'
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

export function StarknetWalletBridge() {
    const getRpcUrl = useBridgeRpcUrl('starknet:')
    const { providers } = useWallet()
    const starknetWalletProvider = providers.find(p => p.id == 'starknet')

    const adapter = useMemo<TrainWalletAdapter>(() => {
        return {
            chainNamespace: chainNamespace('starknet'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCPublicClient('starknet', { rpcUrl: getRpcUrl(networkId) })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, _address?: string) {
                const starknetAccount = starknetWalletProvider?.activeWallet?.metadata?.starknetAccount
                if (!starknetAccount) throw new Error('No Starknet signer available')

                return sdk.createHTLCWalletClient('starknet', {
                    rpcUrl: getRpcUrl(networkId),
                    signer: { address: starknetAccount.address, account: starknetAccount },
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
    }, [starknetWalletProvider, getRpcUrl])

    useRegisterWallet(adapter)
    return null
}