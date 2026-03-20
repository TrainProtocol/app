import { TrainError, TrainErrorCode } from '@train-protocol/sdk'

// App-only codes — things the SDK doesn't know about
export enum AppErrorCode {
    // Wallet interaction
    USER_REJECTED = 'USER_REJECTED',
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    CHAIN_MISMATCH = 'CHAIN_MISMATCH',
    SIGNER_REQUIRED = 'SIGNER_REQUIRED',

    // Transaction
    TX_REVERTED = 'TX_REVERTED',
    TIMELOCK_EXPIRED = 'TIMELOCK_EXPIRED',
    HASHLOCK_MISMATCH = 'HASHLOCK_MISMATCH',

    // Swap lifecycle
    SOLVER_FAILED = 'SOLVER_FAILED',

    // Catch-all
    UNKNOWN = 'UNKNOWN',
}

// Unified type — SDK codes + app-only codes, no duplication
export type ErrorCode = TrainErrorCode | AppErrorCode

export class AppError extends Error {
    override name = 'AppError' as const
    constructor(
        public readonly code: ErrorCode,
        message: string,
    ) {
        super(message)
    }
}

/** Errors where retry is not possible — user must wait for timelock expiry or refund */
export function isActionDisabled(code: ErrorCode): boolean {
    return code === AppErrorCode.TIMELOCK_EXPIRED
        || code === AppErrorCode.SOLVER_FAILED
        || code === AppErrorCode.HASHLOCK_MISMATCH
}

const USER_REJECTED_PATTERNS = [
    'user rejected',
    'user denied',
    'user refused',
    'user_refused_op',
    'rejected the request',
    'request rejected',
    'rejected',
    'user canceled',
    'user cancelled',
]

function extractMessage(raw: unknown): string {
    if (!raw) return ''
    if (typeof raw === 'string') return raw
    const e = raw as Record<string, any>
    return e?.details || e?.shortMessage || e?.message || e?.code || e?.name || String(raw)
}

export function classifyError(raw: unknown): AppError {
    if (raw instanceof AppError) return raw

    // SDK typed errors — preserve code directly
    if (raw instanceof TrainError) {
        return new AppError(raw.code, raw.message)
    }

    const msg = extractMessage(raw)
    const lower = msg.toLowerCase()

    // User rejection (covers wagmi/viem/starknet/solana/argent patterns)
    // Exact match for Starknet/Argent-specific rejection message
    if (msg === 'Execute failed' || USER_REJECTED_PATTERNS.some(p => lower.includes(p))) {
        return new AppError(AppErrorCode.USER_REJECTED, 'Transaction rejected')
    }

    // Insufficient funds
    if (lower.includes('insufficient funds') || lower.includes('insufficient balance')) {
        return new AppError(AppErrorCode.INSUFFICIENT_FUNDS, 'Insufficient funds')
    }

    // Chain mismatch (viem/wagmi error name)
    const name = (raw as any)?.name
    const causeName = (raw as any)?.cause?.name
    if (name === 'ChainMismatchError' || causeName === 'ChainMismatchError') {
        return new AppError(AppErrorCode.CHAIN_MISMATCH, 'Wallet is connected to the wrong network')
    }

    // Signer required (from blockchain packages)
    if (lower.includes('signer required') || lower.includes('signer not configured')) {
        return new AppError(AppErrorCode.SIGNER_REQUIRED, 'Wallet not connected or signer unavailable')
    }

    // Transaction reverted
    if (lower.includes('reverted')) {
        return new AppError(AppErrorCode.TX_REVERTED, msg)
    }

    // Timelock expired
    if (lower.includes('timelock expired')) {
        return new AppError(AppErrorCode.TIMELOCK_EXPIRED, 'Timelock expired')
    }

    return new AppError(AppErrorCode.UNKNOWN, msg || 'An unexpected error occurred')
}
