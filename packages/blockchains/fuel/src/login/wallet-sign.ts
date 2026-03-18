import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/sdk'

/**
 * Minimal interface for a Fuel wallet needed by the login flow.
 * Integrators wrap their Fuel wallet connector into this interface.
 */
export interface FuelWalletLike {
    signMessage(message: string): Promise<string>
}

/**
 * Derive a deterministic login key from a Fuel wallet.
 *
 * Signs a fixed message using the wallet, then derives key material
 * from the signature — analogous to the EVM and TON approaches.
 */
export const deriveKeyFromFuelWallet = async (
    wallet: FuelWalletLike,
): Promise<Buffer> => {
    if (!wallet) {
        throw new Error('Fuel wallet not connected')
    }

    const signature = await wallet.signMessage('I am using TRAIN')

    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature
    const inputMaterial = Buffer.from(sigHex, 'hex')
    const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8')

    return Buffer.from(deriveKeyMaterial(inputMaterial, identitySalt))
}
