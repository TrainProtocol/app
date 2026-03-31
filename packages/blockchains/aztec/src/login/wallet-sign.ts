import { createProtectedKey } from '@train-protocol/auth'

/**
 * Minimal interface for the Aztec wallet needed by the login flow.
 */
export interface AztecWalletLike {
    createAuthWit(from: any, intent: { consumer: any; innerHash: any }): Promise<{ toBuffer(): Uint8Array }>
}

/**
 * Derive a deterministic login key from an Aztec wallet.
 *
 * Uses createAuthWit to produce a signature over a fixed message,
 * then derives key material from that signature — analogous to the EVM
 * approach using eth_signTypedData_v4.
 */
export const deriveKeyFromAztecWallet = async (
    wallet: AztecWalletLike,
    address: string,
): Promise<CryptoKey> => {
    if (!wallet) {
        throw new Error('Aztec wallet not connected')
    }

    const { Fr } = await import('@aztec/aztec.js/fields')
    const { AztecAddress } = await import('@aztec/aztec.js/addresses')

    // Create a deterministic inner hash from a fixed message.
    // Same conceptual message as EVM ("I am using TRAIN").
    const messageBytes = new TextEncoder().encode('I am using TRAIN')
    const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes)
    const innerHash = Fr.fromBuffer(new Uint8Array(hashBuffer) as any)

    const accountAddress = AztecAddress.fromString(address)

    // createAuthWit produces a signature (the "witness") over the message
    const authWitness = await wallet.createAuthWit(
        accountAddress,
        { consumer: accountAddress, innerHash },
    )

    // Serialize the witness into bytes for key derivation
    const witnessBuffer = authWitness.toBuffer()

    return createProtectedKey(witnessBuffer)
}
