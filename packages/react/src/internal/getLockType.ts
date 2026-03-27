const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/**
 * Determine whether a lock is for a native token or an ERC-20.
 * Shared by useSwapProgress, useRefund, and useManualClaim.
 */
export function getLockType(tokenContract: string | null | undefined): 'erc20' | 'native' {
    if (!tokenContract || tokenContract === ZERO_ADDRESS) {
        return 'native'
    }
    return 'erc20'
}
