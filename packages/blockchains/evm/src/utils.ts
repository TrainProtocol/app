import { htlcErrorsBySelector } from "./abi"
import { JsonRpcError } from "./rpc"

export function decodeContractError(error: unknown): string | null {
    if (error instanceof JsonRpcError && typeof error.data === 'string' && error.data.startsWith('0x')) {
        const selector = error.data.slice(0, 10)
        return htlcErrorsBySelector[selector] ?? null
    }
    return null
}

export type Hex = `0x${string}`
export const hex = (v: string): Hex => v as Hex