import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/auth'

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
): Promise<Uint8Array> => {
    if (!wallet) {
        throw new Error('Fuel wallet not connected')
    }

    const signature = await wallet.signMessage('I am using TRAIN')

    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature
    const inputMaterial = new Uint8Array(sigHex.length / 2)
    for (let i = 0; i < sigHex.length; i += 2) {
        inputMaterial[i / 2] = parseInt(sigHex.substring(i, i + 2), 16)
    }
    const identitySalt = new TextEncoder().encode(IDENTITY_SALT)

    return new Uint8Array(deriveKeyMaterial(inputMaterial, identitySalt))
}
