import { addAddressPadding } from 'starknet'

/**
 * Formats a Starknet/Paradex address: pads to 66 chars (0x + 64 hex) and lowercases.
 * Use this for address comparison and display normalization.
 */
export function formatStarknetAddress(address: string): string {
    return addAddressPadding(address).toLowerCase()
}
