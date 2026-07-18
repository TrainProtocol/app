import type { Wallet } from '@aztec/aztec.js/wallet'
import type { ContractFunctionInteraction } from '@aztec/aztec.js/contracts'
import type { AztecWalletLike } from './login/wallet-sign.js'

/**
 * A built Aztec contract function interaction. Output of the builder methods.
 * `buildUserLockTx` returns an array `[authwit, userLock]` to be batched in
 * a single transaction; `buildRefundTx` / `buildRedeemSolverTx` each return
 * a single interaction.
 */
export type AztecTransactionRequest = ContractFunctionInteraction

declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        aztec: AztecHTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        aztec: AztecHTLCWalletClientConfig
    }
    interface HTLCTransactionRequestMap {
        aztec: AztecTransactionRequest
    }
}

declare module '@train-protocol/auth' {
    interface WalletSignConfigMap {
        aztec: AztecWalletSignConfig
    }
}

export type AztecWalletSignConfig = {
    wallet: AztecWalletLike
    address: string
}

export interface AztecSigner {
    wallet: Wallet
    address: string
}

export type AztecHTLCPublicClientConfig = {
    rpcUrl: string
    /** Only wallet operations require a signer; public reads use the Aztec node. */
    signer?: AztecSigner
}

export type AztecHTLCWalletClientConfig = AztecHTLCPublicClientConfig & {
    signer: AztecSigner
}
