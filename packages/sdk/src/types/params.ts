import { Token } from './network'
import { LockDetails } from './lock'

export type CreateHTLCParams = {
    destinationChain: string,
    sourceChain: string,
    amount: string,
    destinationAmount: string,
    decimals: number,
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
    chainId: string | null,
    contractAddress: string,
    index?: number,
    txId?: string,
    decimals?: number,
    solverAddress?: string,
}

export type OldLockParams = {
    type: 'erc20' | 'native';
    id: string,
    lockData?: LockDetails,
    hashlock: string,
    chainId: string | null,
    contractAddress: string,
    lockDataResolver?: (data: any[]) => LockDetails,
    sourceAsset?: Token,
    solver: string,
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

export type ClaimParams = {
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

export type GetCommitsParams = {
    type: 'erc20' | 'native';
    contractAddress: string,
    chainId: string,
}
