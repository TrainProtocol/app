/**
 * Branded (opaque) types for chain identifiers and token references.
 *
 * These types are nominally distinct at compile time (you cannot pass a Caip2Id
 * where a ChainNamespace is expected) but have zero runtime cost — they are
 * just strings with a phantom brand.
 *
 * Use the constructor functions (caip2Id, chainNamespace, etc.) at data
 * boundaries to validate and tag incoming strings.
 */

declare const __brand: unique symbol
type Brand<T, B extends string> = T & { readonly [__brand]: B }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** CAIP-2 chain identifier, e.g. "eip155:1", "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" */
export type Caip2Id = Brand<string, 'Caip2Id'>

/** Chain namespace, e.g. "eip155", "solana", "starknet" */
export type ChainNamespace = Brand<string, 'ChainNamespace'>

/** Chain reference (the part after the colon in a CAIP-2 ID), e.g. "1", "137" */
export type ChainReference = Brand<string, 'ChainReference'>

/** Token ticker symbol, e.g. "USDC", "ETH" */
export type TokenSymbol = Brand<string, 'TokenSymbol'>

/** Token contract address on a specific chain */
export type TokenAddress = Brand<string, 'TokenAddress'>

// ---------------------------------------------------------------------------
// Constructors with runtime validation
// ---------------------------------------------------------------------------

const CAIP2_REGEX = /^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,64}$/

export function caip2Id(value: string): Caip2Id {
    if (!CAIP2_REGEX.test(value)) {
        throw new Error(
            `Invalid CAIP-2 ID: "${value}". Expected format "namespace:reference" (e.g. "eip155:1").`
        )
    }
    return value as Caip2Id
}

export function chainNamespace(value: string): ChainNamespace {
    if (value.includes(':')) {
        throw new Error(
            `Invalid chain namespace: "${value}". ` +
            `This looks like a CAIP-2 ID. Use parseCaip2Id() to extract the namespace.`
        )
    }
    return value as ChainNamespace
}

export function chainReference(value: string): ChainReference {
    return value as ChainReference
}

export function tokenSymbol(value: string): TokenSymbol {
    return value as TokenSymbol
}

export function tokenAddress(value: string): TokenAddress {
    return value as TokenAddress
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export interface ParsedCaip2 {
    namespace: ChainNamespace
    reference: ChainReference
}

export function parseCaip2Id(id: Caip2Id): ParsedCaip2 {
    const colonIndex = id.indexOf(':')
    return {
        namespace: id.slice(0, colonIndex) as ChainNamespace,
        reference: id.slice(colonIndex + 1) as ChainReference,
    }
}
