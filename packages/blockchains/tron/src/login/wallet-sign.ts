import { createProtectedKey } from '@train-protocol/auth'

/**
 * Minimal interface for a Tron wallet needed by the login flow.
 * Integrators wrap their TronWeb wallet adapter into this interface.
 */
export interface TronWalletLike {
    signMessage(message: string): Promise<string>
}

/**
 * Derive a deterministic login key from a Tron wallet.
 *
 * Signs a fixed message using the wallet, then derives key material
 * from the signature — analogous to the EVM and TON approaches.
 */
export const deriveKeyFromTronWallet = async (
    wallet: TronWalletLike,
): Promise<Uint8Array> => {
    if (!wallet) {
        throw new Error('Tron wallet not connected')
    }

    const signature = await wallet.signMessage('I am using TRAIN')

    const sigHex = signature.startsWith('0x') ? signature.slice(2) : signature
    const inputMaterial = new Uint8Array(sigHex.length / 2)
    for (let i = 0; i < sigHex.length; i += 2) {
        inputMaterial[i / 2] = parseInt(sigHex.substring(i, i + 2), 16)
    }
    return createProtectedKey(inputMaterial)
}
