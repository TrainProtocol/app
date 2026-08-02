export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const
export const DEFAULT_FEE_LIMIT = 150_000_000 // 150 TRX in sun
export const TRON_ADDRESS_PREFIX = 0x41

/**
 * TronGrid function signatures — the API requires human-readable selector strings,
 * NOT hex-encoded 4-byte selectors. TronGrid hashes these strings internally.
 */
export const FUNCTION_SIGNATURES = {
    getUserLock: 'getUserLock(bytes32)',
    getSolverLock: 'getSolverLock(bytes32,address)',
    userLock: 'userLock((bytes32,uint256,uint256,uint48,uint48,uint48,address,address,address,string,string,string),(string,string,uint256,string),bytes,bytes)',
    refundUser: 'refundUser(bytes32)',
    redeemSolver: 'redeemSolver(bytes32,address,uint256)',
    allowance: 'allowance(address,address)',
    approve: 'approve(address,uint256)',
} as const