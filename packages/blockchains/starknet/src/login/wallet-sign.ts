import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/sdk'

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
): Promise<Buffer> => {
    if (!account) {
        throw new Error('Starknet wallet not connected')
    }

    // Create a deterministic hash of the message "I am using TRAIN"
    const messageBytes = new TextEncoder().encode('I am using TRAIN')
    const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes)
    const hashHex = '0x' + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

    const typedData = {
        domain: {
            name: 'Train',
            version: '1',
            chainId: options?.chainId ?? 'SN_SEPOLIA',
            revision: '1',
        },
        message: {
            message: hashHex,
        },
        primaryType: 'TrainLogin',
        types: {
            StarknetDomain: [
                { name: 'name', type: 'shortstring' },
                { name: 'version', type: 'shortstring' },
                { name: 'chainId', type: 'shortstring' },
                { name: 'revision', type: 'shortstring' },
            ],
            TrainLogin: [
                { name: 'message', type: 'felt' },
            ],
        },
    }

    const signature = await account.signMessage(typedData)

    // Serialize signature array into bytes for key derivation
    const sigBytes = signature.flatMap(s => {
        const hex = BigInt(s).toString(16).padStart(64, '0')
        const bytes: number[] = []
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substring(i, i + 2), 16))
        }
        return bytes
    })

    const inputMaterial = Buffer.from(sigBytes)
    const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8')
    return Buffer.from(deriveKeyMaterial(inputMaterial, identitySalt))
}
