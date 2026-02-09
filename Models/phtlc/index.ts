import { Token } from "../Network";
import { Commit } from "./PHTLC";

export type CreatePreHTLCParams = {
    destinationChain: string,
    sourceChain: string,
    amount: string,
    decimals: number,
    destinationAsset: string,
    sourceAsset: Token;
    destLpAddress: string;
    srcLpAddress: string;
    atomicContract: string;
    address: string;
    tokenContractAddress?: string | undefined | null;
    chainId?: string | null;
}

export type CommitmentParams = {
    type: 'erc20' | 'native';
    id: string,
    chainId: string | null,
    contractAddress: string,
    /** Index for hashlock-based contracts (EVM v2) */
    index?: number
}

export type LockParams = {
    type: 'erc20' | 'native';
    id: string,
    lockData?: Commit,
    hashlock: string,
    chainId: string | null,
    contractAddress: string,
    lockDataResolver?: (data: any[]) => Commit,
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
    /** Index for hashlock-based contracts (EVM v2) */
    index?: number
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
    /** Index for hashlock-based contracts (EVM v2) */
    index?: number
}

export type GetCommitsParams = {
    type: 'erc20' | 'native';
    contractAddress: string,
    chainId: string,
}