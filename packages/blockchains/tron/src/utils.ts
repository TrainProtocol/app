import { htlcErrorsBySelector } from './abi.js'
import { TronRpcError } from './rpc.js'
import { toEvmHex, evmHexToBase58, isBase58Address } from './address.js'

export type Hex = `0x${string}`
export const hex = (v: string): Hex => v as Hex

export function decodeContractError(error: unknown): string | null {
    if (error instanceof TronRpcError && typeof error.data === 'object' && error.data) {
        const result = error.data as { constant_result?: string[] }
        if (result.constant_result?.[0]) {
            const selector = '0x' + result.constant_result[0].slice(0, 8)
            return htlcErrorsBySelector[selector] ?? null
        }
    }
    return null
}

/** Convert an EVM hex address from contract results to Base58Check Tron address */
export function normalizeResultAddress(address: string): string {
    if (!address) return address
    return evmHexToBase58(address)
}

/** Normalize address for comparison — convert Base58 to EVM hex if needed */
export function normalizeAddress(address: string): string {
    if (isBase58Address(address)) return toEvmHex(address)
    if (!address.startsWith('0x')) return '0x' + address
    return address
}

/** Strip the 4-byte selector from ABI-encoded calldata, returning only the parameters hex (no 0x prefix) */
export function encodeParams(calldata: string): string {
    const clean = calldata.startsWith('0x') ? calldata.slice(2) : calldata
    return clean.slice(8)
}
