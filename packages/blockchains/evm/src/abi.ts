import { AbiFunction, AbiEvent } from 'ox'
import HTLCAbi from './abis/EVM_HTLC.json'

// Pre-parse HTLC contract functions from ABI
export const htlcFunctions = {
    getUserLock: AbiFunction.fromAbi(HTLCAbi, 'getUserLock'),
    getSolverLock: AbiFunction.fromAbi(HTLCAbi, 'getSolverLock'),
    getSolverLockCount: AbiFunction.fromAbi(HTLCAbi, 'getSolverLockCount'),
    userLock: AbiFunction.fromAbi(HTLCAbi, 'userLock'),
    refundUser: AbiFunction.fromAbi(HTLCAbi, 'refundUser'),
    redeemSolver: AbiFunction.fromAbi(HTLCAbi, 'redeemSolver'),
}

// Pre-parse HTLC events from ABI
export const htlcEvents = {
    UserLocked: AbiEvent.fromAbi(HTLCAbi, 'UserLocked'),
}

// Pre-computed keccak256 selectors for HTLC custom errors (no ox AbiError needed)
export const htlcErrorsBySelector: Record<string, string> = {
    '0x7a5cb6ca': 'HashlockMismatch',
    '0xaf16754b': 'InvalidRewardTimelock',
    '0xf8d10e82': 'InvalidTimelock',
    '0xc1ab6dc1': 'InvalidToken',
    '0xc10ddcde': 'LockNotFound',
    '0x3560269b': 'LockNotPending',
    '0xbc6f88c5': 'MsgValueMismatch',
    '0x8727a7f9': 'QuoteExpired',
    '0x3ee5aeb5': 'ReentrancyGuardReentrantCall',
    '0x089c9987': 'RefundNotAllowed',
    '0x734530ce': 'SwapAlreadyExists',
    '0x90b8ec18': 'TransferFailed',
    '0x1f2a2005': 'ZeroAmount',
}

// ERC20 functions — inline instead of importing the broken StarkNet ABI
export const erc20Functions = {
    allowance: AbiFunction.from(
        'function allowance(address owner, address spender) view returns (uint256)'
    ),
    approve: AbiFunction.from(
        'function approve(address spender, uint256 amount) returns (bool)'
    ),
}
