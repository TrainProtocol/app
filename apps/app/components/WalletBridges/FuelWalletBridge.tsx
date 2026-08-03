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
import { Address } from '@/lib/address'
import { useWalletStore } from '@/stores/walletStore'
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

export function FuelWalletBridge() {
    const connectedWallets = useWalletStore(state => state.connectedWallets)
    const fuelWallet = connectedWallets.find(wallet => wallet.providerName === 'Fuel')
    const address = fuelWallet?.address ?? null
    const { wallet: account } = useWallet({ account: address })
    const getRpcUrl = useBridgeRpcUrl('fuel:')

    const adapter = useMemo<TrainWalletAdapter>(() => {
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
    }, [account, getRpcUrl])

    useRegisterWallet(adapter)
    return null
}
