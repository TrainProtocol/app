export enum TrainErrorCode {
    // API
    API_REQUEST_FAILED = 'API_REQUEST_FAILED',
    API_CLIENT_MISCONFIGURED = 'API_CLIENT_MISCONFIGURED',

    // Consensus
    CONSENSUS_MISMATCH = 'CONSENSUS_MISMATCH',
    CONSENSUS_QUORUM_NOT_MET = 'CONSENSUS_QUORUM_NOT_MET',

    // Registry
    HTLC_CLIENT_NOT_REGISTERED = 'HTLC_CLIENT_NOT_REGISTERED',
    WALLET_SIGN_NOT_REGISTERED = 'WALLET_SIGN_NOT_REGISTERED',

    // Passkey
    PASSKEY_BROWSER_REQUIRED = 'PASSKEY_BROWSER_REQUIRED',
    PASSKEY_HTTPS_REQUIRED = 'PASSKEY_HTTPS_REQUIRED',
    PASSKEY_CREATION_FAILED = 'PASSKEY_CREATION_FAILED',
    PASSKEY_NOT_FOUND = 'PASSKEY_NOT_FOUND',
    PASSKEY_CANCELLED = 'PASSKEY_CANCELLED',
    PASSKEY_PRF_UNAVAILABLE = 'PASSKEY_PRF_UNAVAILABLE',

    // Validation
    INVALID_INPUT = 'INVALID_INPUT',
}

export class TrainError extends Error {
    override name = 'TrainError' as const
    constructor(
        public readonly code: TrainErrorCode,
        message: string,
        options?: ErrorOptions,
    ) {
        super(message, options)
    }
}
