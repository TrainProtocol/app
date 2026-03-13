import type { NetworkNode } from '@train-protocol/sdk'

/**
 * A resolved RPC node. Identical to NetworkNode so the result can be
 * assigned directly to Network.nodes without mapping.
 */
export type ResolvedNode = NetworkNode

export type ChainNamespace = 'eip155' | 'solana' | 'starknet' | 'aztec' | 'ton'
