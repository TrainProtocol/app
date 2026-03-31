import { createProtectedKey } from '@train-protocol/auth'

/**
 * Minimal interface for the Solana wallet needed by the login flow.
 */
export interface SolanaWalletLike {
    signMessage(message: Uint8Array): Promise<Uint8Array>
}

/**
 * Derive a deterministic login key from a Solana wallet.
 *
 * Signs a fixed UTF-8 message, then derives key material from the resulting
 * signature — analogous to the EVM approach using eth_signTypedData_v4.
 */
export const deriveKeyFromSolanaWallet = async (
    wallet: SolanaWalletLike,
): Promise<CryptoKey> => {
    if (!wallet?.signMessage) {
        throw new Error('Solana wallet does not support message signing')
    }

    const message = new TextEncoder().encode('I am using TRAIN')
    const signature = await wallet.signMessage(message)

    return createProtectedKey(signature)
}
