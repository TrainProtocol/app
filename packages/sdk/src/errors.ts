export class TrainSDKError extends Error {
    constructor(message: string, public code: string) {
        super(message)
        this.name = 'TrainSDKError'
    }
}

export class SignerRequiredError extends TrainSDKError {
    constructor(message = 'Signer required') {
        super(message, 'SIGNER_REQUIRED')
        this.name = 'SignerRequiredError'
    }
}

export class InvalidTxHashError extends TrainSDKError {
    constructor(message = 'Invalid transaction hash format') {
        super(message, 'INVALID_TX_HASH')
        this.name = 'InvalidTxHashError'
    }
}

export class LockNotFoundError extends TrainSDKError {
    constructor(message = 'Lock not found') {
        super(message, 'LOCK_NOT_FOUND')
        this.name = 'LockNotFoundError'
    }
}

export class RegistrationError extends TrainSDKError {
    constructor(message: string) {
        super(message, 'NOT_REGISTERED')
        this.name = 'RegistrationError'
    }
}
