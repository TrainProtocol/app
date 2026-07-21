import { LockStatus, SolverLockDetails } from '../types/lock'

export interface VerificationResult {
    verified: boolean
    skipped: boolean
    mismatches: string[]
}

export interface VerifySolverLockParams {
    solverLockDetails: SolverLockDetails
    expectedReceiveAmount: number
    expectedReceiveAmountInBaseUnits?: bigint
    expectedRecipient: string
    expectedToken: string | undefined | null
    expectedSender?: string | undefined | null
    expectedSourceTimelock?: number | undefined | null
    minimumTimelockSafetyMarginSeconds?: number
    nowInSeconds?: number
}

export function verifySolverLock(params: VerifySolverLockParams): VerificationResult {
    const {
        solverLockDetails,
        expectedReceiveAmount,
        expectedReceiveAmountInBaseUnits,
        expectedRecipient,
        expectedToken,
        expectedSender,
        expectedSourceTimelock,
        minimumTimelockSafetyMarginSeconds = 600,
        nowInSeconds = Math.floor(Date.now() / 1000),
    } = params

    if (!solverLockDetails?.sender) {
        return { verified: false, skipped: false, mismatches: [] }
    }

    const mismatches: string[] = []

    // Only a positive, pending solver-lock index can be redeemed safely.
    if (solverLockDetails.status !== LockStatus.Pending) {
        mismatches.push(`Status: expected pending, got ${LockStatus[solverLockDetails.status] ?? solverLockDetails.status}`)
    }
    if (!Number.isInteger(solverLockDetails.index) || solverLockDetails.index <= 0) {
        mismatches.push(`Index: expected a positive solver lock index, got ${solverLockDetails.index}`)
    }

    if (expectedSender && !addressEquals(solverLockDetails.sender, expectedSender)) {
        mismatches.push(`Sender: expected ${expectedSender}, got ${solverLockDetails.sender}`)
    }

    // 1. Amount: compare exact base units whenever the caller supplies them. A
    // formatted JS number cannot distinguish small differences for large values.
    const actualAmount = solverLockDetails.amount
    if (expectedReceiveAmountInBaseUnits !== undefined) {
        if (solverLockDetails.amountInBaseUnits === undefined) {
            mismatches.push('Amount: exact on-chain amount is unavailable')
        } else if (solverLockDetails.amountInBaseUnits !== expectedReceiveAmountInBaseUnits) {
            mismatches.push(
                `Amount: expected ${expectedReceiveAmountInBaseUnits} base units, got ${solverLockDetails.amountInBaseUnits}`,
            )
        }
    } else if (actualAmount !== expectedReceiveAmount) {
        mismatches.push(`Amount: expected ${expectedReceiveAmount}, got ${actualAmount}`)
    }

    // 2. Recipient: must match expected destination address
    if (expectedRecipient && !addressEquals(solverLockDetails.recipient, expectedRecipient)) {
        mismatches.push(`Recipient: expected ${expectedRecipient}, got ${solverLockDetails.recipient || 'missing'}`)
    }

    // 3. Token: must match destination asset contract
    const actualToken = solverLockDetails.token
    if (expectedToken && !addressEquals(actualToken, expectedToken)) {
        mismatches.push(`Token: expected ${expectedToken}, got ${actualToken || 'missing'}`)
    }

    // 4. The destination lock must still be live and leave the solver enough time to
    // redeem the source lock after paying the user on the destination chain.
    if (expectedSourceTimelock) {
        if (solverLockDetails.timelock <= nowInSeconds) {
            mismatches.push(`Timelock: destination lock expired at ${solverLockDetails.timelock}`)
        }
        if (solverLockDetails.timelock + minimumTimelockSafetyMarginSeconds > expectedSourceTimelock) {
            mismatches.push(
                `Timelock: destination expiry ${solverLockDetails.timelock} does not leave the required ${minimumTimelockSafetyMarginSeconds}s source-chain safety margin`,
            )
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
    if (addr1 === addr2) return true

    // Hex addresses (EVM, Starknet, …) are case-insensitive and may be written with
    // different leading-zero padding (e.g. 0x4e47… vs 0x04e47… on Starknet). Compare
    // them by numeric value so neither casing nor padding causes a false mismatch.
    // Base58 and other chain-specific formats are case- and padding-sensitive, so they
    // only match when byte-identical (handled by the === check above).
    const isHexAddress = (value: string) => /^0x[0-9a-f]+$/i.test(value)
    return isHexAddress(addr1) && isHexAddress(addr2) && BigInt(addr1) === BigInt(addr2)
}
