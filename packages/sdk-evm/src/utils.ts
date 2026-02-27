import type { JsonRpcClient } from './rpc.js'
import type { RpcTransactionReceipt } from './types.js'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

/** Convert a human-readable amount to its smallest unit (e.g. '1.5' with 18 decimals → 1500000000000000000n) */
export function parseUnits(value: string, decimals: number): bigint {
    const [integer = '0', fraction = ''] = value.split('.')
    const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
    return BigInt(integer + paddedFraction)
}

/** Convert from smallest unit to human-readable (e.g. 1500000000000000000n with 18 decimals → '1.5') */
export function formatUnits(value: bigint, decimals: number): string {
    const str = value.toString().padStart(decimals + 1, '0')
    const intPart = str.slice(0, str.length - decimals) || '0'
    const fracPart = str.slice(str.length - decimals).replace(/0+$/, '')
    return fracPart ? `${intPart}.${fracPart}` : intPart
}

/** Convert a bigint to a 0x-prefixed 32-byte hex string */
export function toHex32(value: bigint): string {
    return ('0x' + value.toString(16).padStart(64, '0')) as string
}

/** Poll for a transaction receipt until confirmed or timeout */
export async function waitForReceipt(
    rpc: JsonRpcClient,
    txHash: string,
    options?: { timeout?: number; interval?: number }
): Promise<RpcTransactionReceipt> {
    const timeout = options?.timeout ?? 120_000
    const interval = options?.interval ?? 2_000
    const start = Date.now()

    while (Date.now() - start < timeout) {
        const receipt = await rpc.getTransactionReceipt(txHash)
        if (receipt) {
            if (receipt.status === '0x0') {
                throw new Error(`Transaction reverted: ${txHash}`)
            }
            return receipt
        }
        await new Promise(r => setTimeout(r, interval))
    }
    throw new Error(`Transaction receipt timeout after ${timeout}ms: ${txHash}`)
}
