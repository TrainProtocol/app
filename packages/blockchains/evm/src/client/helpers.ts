import { AbiEvent } from 'ox'
import { htlcEvents } from '../abi.js'
import type { RpcLog, RpcTransactionReceipt } from '../types.js'
import type { JsonRpcClient } from '../rpc.js'
import type { Hex } from '../utils.js'
import { hex } from '../utils.js'

export function findUserLockedEvent(logs: RpcLog[], matchHashlock?: string): Record<string, unknown> | null {
    for (const log of logs) {
        try {
            const decoded = AbiEvent.decode(htlcEvents.UserLocked, {
                data: hex(log.data),
                topics: log.topics as [Hex, ...Hex[]],
            }) as unknown as Record<string, unknown>

            if (!matchHashlock || decoded.hashlock === matchHashlock) {
                return decoded
            }
        } catch {
            // Not a UserLocked event — skip
        }
    }
    return null
}

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
