import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/auth'

/**
 * Minimal interface for a TON wallet needed by the login flow.
 * Integrators wrap their TonConnect wallet into this interface.
 */
export interface TonWalletLike {
    signMessage(message: string): Promise<string>
}

/**
 * Derive a deterministic login key from a TON wallet.
 *
 * Signs a fixed message using the wallet, then derives key material
 * from the signature — analogous to the EVM and Starknet approaches.
 */
export const deriveKeyFromTonWallet = async (
    wallet: TonWalletLike,
): Promise<Uint8Array> => {
    if (!wallet) {
        throw new Error('TON wallet not connected')
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
