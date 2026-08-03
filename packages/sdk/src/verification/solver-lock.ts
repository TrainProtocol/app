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
    /** The destination chain's ConstantPayoutCurve. Per-chain, so never the source lock's curve. */
    expectedPayoutCurve?: string | undefined | null
    expectedSourceTimelock?: number | undefined | null
    minimumTimelockSafetyMarginSeconds?: number
    minimumDestinationLockLifetimeSeconds?: number
    nowInSeconds?: number
}

export const DEFAULT_MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS = 5 * 60

export function verifySolverLock(params: VerifySolverLockParams): VerificationResult {
    const {
        solverLockDetails,
        expectedReceiveAmount,
        expectedReceiveAmountInBaseUnits,
        expectedRecipient,
        expectedToken,
        expectedSender,
        expectedPayoutCurve,
        expectedSourceTimelock,
        minimumTimelockSafetyMarginSeconds = 600,
        minimumDestinationLockLifetimeSeconds = DEFAULT_MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS,
        nowInSeconds = Math.floor(Date.now() / 1000),
    } = params

    if (!solverLockDetails?.sender) {
        return { verified: false, skipped: false, mismatches: [] }
    }

    const mismatches: string[] = []

    // Only a pending lock can be redeemed safely.
    if (solverLockDetails.status !== LockStatus.Pending) {
        mismatches.push(`Status: expected pending, got ${LockStatus[solverLockDetails.status] ?? solverLockDetails.status}`)
    }

    // The sender is the solver address the lock is keyed by, so this check also
    // confirms we read the lock belonging to the quoted solver.
    if (expectedSender && !addressEquals(solverLockDetails.sender, expectedSender)) {
        mismatches.push(`Sender: expected ${expectedSender}, got ${solverLockDetails.sender}`)
    }

    // A curve can only reduce the payout (0 < payout <= amount, remainder to the solver), so
    // anything but no curve or the destination chain's ConstantPayoutCurve voids the amount
    // check below. Both pay in full and ignore payoutCurveData, so the config is not compared.
    if (solverLockDetails.payoutCurve !== null) {
        if (!expectedPayoutCurve) {
            mismatches.push(
                solverLockDetails.payoutCurve
                    ? `Payout curve: destination chain has no recognized full-payout curve to check ${solverLockDetails.payoutCurve} against`
                    : 'Payout curve: on-chain payout policy is unavailable',
            )
        } else if (!addressEquals(solverLockDetails.payoutCurve, expectedPayoutCurve)) {
            mismatches.push(
                `Payout curve: expected none or ${expectedPayoutCurve}, got ${solverLockDetails.payoutCurve || 'unavailable'}`,
            )
        }
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

    // 4. The destination lock must leave enough time for the automatic claim to
    // fail and for the user-facing manual claim fallback to be submitted safely.
    const destinationTimelock = solverLockDetails.timelock
    if (!Number.isSafeInteger(destinationTimelock) || destinationTimelock <= 0) {
        mismatches.push(`Timelock: destination expiry is invalid (${destinationTimelock})`)
    } else if (destinationTimelock <= nowInSeconds) {
        mismatches.push(`Timelock: destination lock expired at ${destinationTimelock}`)
    } else if (destinationTimelock - nowInSeconds < minimumDestinationLockLifetimeSeconds) {
        mismatches.push(
            `Timelock: destination lock has less than the required ${minimumDestinationLockLifetimeSeconds}s remaining`,
        )
    }

    // The source lock must outlive the destination by the cross-chain safety margin.
    if (expectedSourceTimelock !== undefined && expectedSourceTimelock !== null) {
        if (destinationTimelock + minimumTimelockSafetyMarginSeconds > expectedSourceTimelock) {
            mismatches.push(
                `Timelock: destination expiry ${destinationTimelock} does not leave the required ${minimumTimelockSafetyMarginSeconds}s source-chain safety margin`,
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
