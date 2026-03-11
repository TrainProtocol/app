export interface ResolvedNode {
    url: string
    providerName: string
}

export type ChainNamespace = 'eip155' | 'solana' | 'starknet' | 'aztec' | 'ton'
