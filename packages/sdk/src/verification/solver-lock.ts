import { LockDetails } from '../types/lock'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const isNativeToken = (addr: string | undefined | null): boolean =>
    !addr || addr === ZERO_ADDRESS

export interface VerificationResult {
    verified: boolean
    skipped: boolean
    mismatches: string[]
}

export interface VerifySolverLockParams {
    solverLockDetails: LockDetails
    expectedReceiveAmount: number
    expectedRecipient: string
    expectedToken: string | undefined | null
}

export function verifySolverLock(params: VerifySolverLockParams): VerificationResult {
    const { solverLockDetails, expectedReceiveAmount, expectedRecipient, expectedToken } = params

    if (!solverLockDetails?.sender) {
        return { verified: false, skipped: false, mismatches: [] }
    }

    const mismatches: string[] = []

    // 1. Amount: solver must lock >= expected receive amount
    const actualAmount = solverLockDetails.amount
    if (actualAmount !== expectedReceiveAmount) {
        mismatches.push(`Amount: expected ${expectedReceiveAmount}, got ${actualAmount}`)
    }

    // 2. Recipient: must match expected destination address
    if (expectedRecipient && solverLockDetails.recipient) {
        if (!addressEquals(solverLockDetails.recipient, expectedRecipient)) {
            mismatches.push(`Recipient: expected ${expectedRecipient}, got ${solverLockDetails.recipient}`)
        }
    }

    // 3. Token: must match destination asset contract (normalise native = zero address)
    const actualToken = solverLockDetails.token
    const expectedIsNative = isNativeToken(expectedToken)
    const actualIsNative = isNativeToken(actualToken)

    if (expectedIsNative !== actualIsNative) {
        mismatches.push(`Token: expected ${expectedIsNative ? 'native' : expectedToken}, got ${actualIsNative ? 'native' : actualToken}`)
    } else if (!expectedIsNative && !actualIsNative) {
        if (actualToken && expectedToken && !addressEquals(actualToken, expectedToken)) {
            mismatches.push(`Token: expected ${expectedToken}, got ${actualToken}`)
        }
    }

    return {
        verified: mismatches.length === 0,
        skipped: false,
        mismatches,
    }
}

function addressEquals(addr1: string | undefined | null, addr2: string | undefined | null): boolean {
    if (!addr1 || !addr2) return false
    return addr1.toLowerCase() === addr2.toLowerCase()
}