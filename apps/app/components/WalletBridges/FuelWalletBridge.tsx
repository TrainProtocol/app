import { useMemo } from 'react'
import { useWallet } from '@fuels/react'
import { Provider } from 'fuels'
import {
    chainNamespace,
    useRegisterWallet,
    type Caip2Id,
    type TrainWalletAdapter,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useSettingsState } from '@/context/settings'
import { Address } from '@/lib/address'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import { useWalletStore } from '@/stores/walletStore'

export function FuelWalletBridge() {
    const connectedWallets = useWalletStore(state => state.connectedWallets)
    const fuelWallet = connectedWallets.find(wallet => wallet.providerName === 'Fuel')
    const address = fuelWallet?.address ?? null
    const { wallet: account } = useWallet({ account: address })
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(state => state.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => {
        function getRpcUrl(caip2Id?: Caip2Id): string {
            const network = networks.find(candidate =>
                caip2Id
                    ? candidate.caip2Id === (caip2Id as string)
                    : candidate.caip2Id.startsWith('fuel:')
            )
            if (!network) return ''
            return getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''
        }

        return {
            chainNamespace: chainNamespace('fuel'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCPublicClient('fuel', {
                    rpcUrl: getRpcUrl(networkId),
                })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, requestedAddress?: string) {
                if (!account) throw new Error('No Fuel signer available')
                const accountAddress = account.address.toB256()
                if (requestedAddress &&
                    !Address.equals(accountAddress, requestedAddress, null, 'fuel')) {
                    throw new Error(`No connected Fuel wallet found for address "${requestedAddress}"`)
                }

                account.connect(new Provider(getRpcUrl(networkId)))
                return sdk.createHTLCWalletClient('fuel', {
                    rpcUrl: getRpcUrl(networkId),
                    signer: { account },
                })
            },

            getLoginConfig: requestedAddress => {
                if (!account) return null
                const accountAddress = account.address.toB256()
                if (requestedAddress &&
                    !Address.equals(accountAddress, requestedAddress, null, 'fuel')) return null
                return { wallet: account }
            },
        }
    }, [account, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
