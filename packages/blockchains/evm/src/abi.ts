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

// ERC20 functions — inline instead of importing the broken StarkNet ABI
export const erc20Functions = {
    allowance: AbiFunction.from(
        'function allowance(address owner, address spender) view returns (uint256)'
    ),
    approve: AbiFunction.from(
        'function approve(address spender, uint256 amount) returns (bool)'
    ),
}
