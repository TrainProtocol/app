// Compatibility shim — wraps SDK wallet sign registry with the Starknet wallet
import { deriveKeyFromWallet } from '@train-protocol/sdk'

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'

export const deriveKeyFromStarknetSignature = async (
    starknetAccount: { signMessage(typedData: unknown): Promise<string[]> },
    address: string,
): Promise<Buffer> => {
    return deriveKeyFromWallet('starknet', {
        provider: starknetAccount,
        address,
        options: { chainId: isSandbox ? 'SN_SEPOLIA' : 'SN_MAIN' },
    })
}
