import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/auth'

/**
 * Minimal interface for a Starknet account needed by the login flow.
 */
export interface StarknetAccountLike {
    signMessage(typedData: unknown): Promise<string[]>
}

/**
 * Derive a deterministic login key from a Starknet wallet.
 *
 * Uses Starknet typed data signing (SNIP-12) to produce a signature
 * over a fixed message, then derives key material from that signature —
 * analogous to the EVM approach using eth_signTypedData_v4.
 */
export const deriveKeyFromStarknetWallet = async (
    account: StarknetAccountLike,
    _address: string,
    options?: { chainId?: string },
): Promise<Uint8Array> => {
    if (!account) {
        throw new Error('Starknet wallet not connected')
    }

    const typedData = {
        domain: {
            name: 'Train',
            version: '1',
            chainId: options?.chainId ?? 'SN_SEPOLIA',
        },
        message: {
            message: 'I am using TRAIN',
        },
        primaryType: 'TrainLogin',
        types: {
            StarkNetDomain: [
                { name: 'name', type: 'felt' },
                { name: 'chainId', type: 'felt' },
                { name: 'version', type: 'felt' },
            ],
            TrainLogin: [
                { name: 'message', type: 'felt' },
            ],
        },
    }

    const signature = await account.signMessage(typedData)

    // Serialize signature array into bytes for key derivation
    const sigBytes: number[] = signature.flatMap(s => {
        const hex = BigInt(s).toString(16).padStart(64, '0')
        const bytes: number[] = []
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substring(i, i + 2), 16))
        }
        return bytes
    })

    const inputMaterial = new Uint8Array(sigBytes)
    const identitySalt = new TextEncoder().encode(IDENTITY_SALT)
    return new Uint8Array(deriveKeyMaterial(inputMaterial, identitySalt))
}
