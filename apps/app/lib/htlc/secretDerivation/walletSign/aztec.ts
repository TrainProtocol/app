// Compatibility shim — wraps SDK wallet sign registry with the Aztec wallet API
import { deriveKeyFromWallet } from '@train-protocol/sdk'

export const deriveKeyFromAztecWallet = async (
    aztecWallet: any,
    address: string,
): Promise<Buffer> => {
    return deriveKeyFromWallet('aztec', {
        wallet: aztecWallet,
        address,
    })
}
