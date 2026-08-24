import { useEffect, useMemo, useState } from 'react'
import { useFuelStore } from '@layerswap/wallet-fuel'
import { Provider, type Account } from 'fuels'
import { chainNamespace, useRegisterWallet, type Caip2Id, type TrainWalletAdapter, } from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { Address } from '@/lib/address'
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

export function FuelWalletBridge() {
    const fuel = useFuelStore(state => state.fuel)
    const fuelWallet = useFuelStore(state => state.connectedWallets[0])
    const address = fuelWallet?.address ?? null
    const [account, setAccount] = useState<Account | null>(null)
    const getRpcUrl = useBridgeRpcUrl('fuel:')

    useEffect(() => {
        let cancelled = false
        setAccount(null)
        if (!fuel || !address) return

        void fuel.getWallet(address).then(wallet => {
            if (!cancelled) setAccount(wallet)
        }).catch(() => {
            if (!cancelled) setAccount(null)
        })

        return () => { cancelled = true }
    }, [fuel, address])

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