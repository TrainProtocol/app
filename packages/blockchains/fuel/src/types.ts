import type {
    Account,
    BigNumberish,
    BN,
    Bytes,
    ScriptTransactionRequest,
} from 'fuels'

declare module '@train-protocol/sdk' {
    interface HTLCPublicClientConfigMap {
        fuel: FuelHTLCPublicClientConfig
    }
    interface HTLCWalletClientConfigMap {
        fuel: FuelHTLCWalletClientConfig
    }
    interface HTLCTransactionRequestMap {
        fuel: FuelTransactionRequest
    }
}

declare module '@train-protocol/auth' {
    interface WalletSignConfigMap {
        fuel: FuelWalletSignConfig
    }
}

export interface FuelWalletLike {
    signMessage(message: string): Promise<string>
}

export type FuelWalletSignConfig = {
    wallet: FuelWalletLike
}

export type FuelTransactionRequest = ScriptTransactionRequest

export interface FuelSigner {
    account: Account
}

export type FuelHTLCPublicClientConfig = {
    rpcUrl: string
}

export type FuelHTLCWalletClientConfig = FuelHTLCPublicClientConfig & {
    signer: FuelSigner
}

export type FuelIdentity =
    | { Address: { bits: string } }
    | { ContractId: { bits: string } }

export type FuelLockStatus = 'Empty' | 'Pending' | 'Refunded' | 'Redeemed'

export interface FuelUserLock {
    secret: BN | BigNumberish
    amount: BN | BigNumberish
    sender: FuelIdentity
    timelock: BN | BigNumberish
    start_time: BN | BigNumberish
    status: FuelLockStatus | number
    recipient: FuelIdentity
    refund_to: FuelIdentity
    asset_id: { bits: string }
    payout_curve?: { bits: string }
    payout_curve_data?: Bytes
}

export interface FuelSolverLock extends FuelUserLock {
    reward: BN | BigNumberish
    reward_timelock: BN | BigNumberish
    reward_recipient: FuelIdentity
    reward_asset_id: { bits: string }
    reward_funded: boolean
}

export interface FuelUserLockedEvent {
    hashlock: string
    sender: FuelIdentity
    recipient: FuelIdentity
    src_chain: string
    asset_id: { bits: string }
    amount: BN | BigNumberish
    timelock: BN | BigNumberish
    start_time: BN | BigNumberish
    payout_curve?: { bits: string }
    dst_chain: string
    dst_address: string
    dst_amount: BN | BigNumberish
    dst_token: string
    reward_amount: BN | BigNumberish
    reward_token: string
    reward_recipient: string
    reward_timelock_delta: BN | BigNumberish
    quote_expiry: BN | BigNumberish
    user_data: Bytes
    solver_data: Bytes
}

export interface FuelUserLockInput {
    hashlock: string
    timelock_delta: BigNumberish
    quote_expiry: BigNumberish
    recipient: FuelIdentity
    refund_to: FuelIdentity
    payout_curve?: { bits: string }
    payout_curve_data?: Bytes
    reward_amount: BigNumberish
    reward_timelock_delta: BigNumberish
    reward_token: string
    reward_recipient: string
    src_chain: string
}

export interface FuelDestinationInfoInput {
    dst_chain: string
    dst_address: string
    dst_amount: BigNumberish
    dst_token: string
}
