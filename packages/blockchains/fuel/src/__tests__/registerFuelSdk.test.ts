import { TrainAuth } from '@train-protocol/auth'
import { TrainSDK } from '@train-protocol/sdk'
import { describe, expect, it } from 'vitest'
import { registerFuelSdk } from '../index'

describe('registerFuelSdk', () => {
    it('registers isolated SDK and auth factories', () => {
        const sdk = new TrainSDK()
        const auth = new TrainAuth()

        registerFuelSdk(sdk, auth)

        expect(sdk.getRegisteredNamespaces()).toContain('fuel')
        expect(auth.getRegisteredWalletSignProviders()).toContain('fuel')
        const client = sdk.createHTLCPublicClient('fuel', {
            rpcUrl: 'https://testnet.fuel.network/v1/graphql',
        })
        expect(typeof client.getUserLockDetails).toBe('function')
        expect(typeof client.getSolverLockDetails).toBe('function')
    })
})
