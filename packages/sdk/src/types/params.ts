import { Token } from './network'

export type UserLockParams = {
    destinationChain: string,
    sourceChain: string,
    amount: string,
    destinationAmount: string,
    destinationAsset: string,
    sourceAsset: Token;
    destLpAddress: string;
    srcLpAddress: string;
    atomicContract: string;
    sourceAddress: string;
    destinationAddress: string;
    tokenContractAddress?: string | undefined | null;
    chainId?: string | null;
    solverData?: string;
    quoteExpiry: number;
    rewardToken?: string;
    rewardRecipient?: string;
    rewardAmount?: string;
    rewardTimelockDelta?: number;
    timelockDelta?: number;
    hashlock: string;
    nonce: number
}

export type LockParams = {
    type?: 'erc20' | 'native';
    id: string,
    txId?: string,
    index?: number,
    chainId: string | null,
    trainContractAddress: string,
    tokenDecimals: number,
    destinationTokenDecimals: number,
    solverAddress?: string,
}

export type RefundParams = {
    type: 'erc20' | 'native';
    chainId: string | null,
    contractAddress: string,
    id: string,
    hashlock?: string | undefined,
    sourceAsset: Token,
    index?: number,
}

export type RedeemSolverParams = {
    type: 'erc20' | 'native';
    chainId: string | null,
    contractAddress: string,
    id: string,
    secret: string | bigint,
    sourceAsset: Token,
    destLpAddress: string,
    destinationAddress?: string,
    destinationAsset?: Token,
    index?: number,
}