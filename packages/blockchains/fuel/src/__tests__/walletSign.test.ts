import { Wallet } from 'fuels'
import { describe, expect, it } from 'vitest'
import { deriveKeyFromFuelWallet } from '../login/wallet-sign'

describe('deriveKeyFromFuelWallet', () => {
    it('derives deterministic browser-safe key material from a Fuel signature', async () => {
        const wallet = Wallet.fromPrivateKey(`0x${'11'.repeat(32)}`)

        const first = await deriveKeyFromFuelWallet(wallet)
        const second = await deriveKeyFromFuelWallet(wallet)

        expect(first).toBeInstanceOf(Uint8Array)
        expect(first).toEqual(second)
        expect(first.length).toBeGreaterThan(0)
    })
})
