import { Network, Token } from "./Network"
import { Wallet } from "./WalletProvider"

export type GasProps = {
    network: Network,
    token: Token,
    address?: `0x${string}`,
    recipientAddress?: string,
    wallet?: Wallet
    contractMethod?: 'commit' | 'addLock',
}

export type Balance = {
    network: string,
    amount: number,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
}

export type Gas = {
    token: string,
    gas: number,
    gasDetails?: {
        gasLimit?: number,
        maxFeePerGas?: number,
        gasPrice?: number,
        maxPriorityFeePerGas?: number
    },
    request_time: string
}