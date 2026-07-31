export const MANUAL_CLAIM_DELAY_MS = 3 * 60 * 1000
export const DESTINATION_CLAIM_SUBMISSION_BUFFER_SECONDS = 2 * 60

/**
 * A verified destination lock must remain claimable through the UI's manual-claim
 * delay plus enough time for wallet confirmation and transaction inclusion.
 */
export const MINIMUM_DESTINATION_LOCK_LIFETIME_SECONDS =
    MANUAL_CLAIM_DELAY_MS / 1000 + DESTINATION_CLAIM_SUBMISSION_BUFFER_SECONDS
