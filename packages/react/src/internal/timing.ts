export const MANUAL_CLAIM_DELAY_MS = 3 * 60 * 1000
export const DESTINATION_CLAIM_SUBMISSION_BUFFER_SECONDS = 2 * 60

/** Attempts (not retries) for the reveal-secret POST before the failure is surfaced. */
export const REVEAL_MAX_ATTEMPTS = 3
export const REVEAL_RETRY_DELAY_MS = 1000

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

/**
 * Total budget for one light-client verification attempt (worker init + sync +
 * head-lag retries — the light client trails the chain head by 1-2 slots).
 */
export const LIGHT_CLIENT_VERIFY_TIMEOUT_MS = 60_000
/** Hook-side backstop so a misbehaving app-supplied verifier cannot wedge verification. */
export const LIGHT_CLIENT_BACKSTOP_MS = LIGHT_CLIENT_VERIFY_TIMEOUT_MS + 5_000

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
        promise.then(
            (value) => { clearTimeout(timer); resolve(value) },
            (err) => { clearTimeout(timer); reject(err) },
        )
    })
}

/**
 * A verified destination lock must remain claimable through the UI's manual-claim
 * delay plus enough time for wallet confirmation and transaction inclusion.
 */
export const MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS =
    MANUAL_CLAIM_DELAY_MS / 1000 + DESTINATION_CLAIM_SUBMISSION_BUFFER_SECONDS
