import type { Wallet } from '@aztec/aztec.js/wallet'

export interface AztecSigner {
    wallet: Wallet
    address: string
    sponsorAddress: string
}

export interface AztecHTLCClientConfig {
    rpcUrl: string
    signer?: AztecSigner
}
