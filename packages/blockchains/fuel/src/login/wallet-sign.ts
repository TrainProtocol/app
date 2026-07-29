import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/auth'
import { hexToBytes } from '@train-protocol/sdk'
import type { FuelWalletLike } from '../types.js'

export async function deriveKeyFromFuelWallet(wallet: FuelWalletLike): Promise<Uint8Array> {
    const signature = await wallet.signMessage('I am using TRAIN')
    const inputMaterial = Uint8Array.from(hexToBytes(signature, 64))
    const identitySalt = new TextEncoder().encode(IDENTITY_SALT)
    return new Uint8Array(deriveKeyMaterial(inputMaterial, identitySalt))
}
