import type { JsonRpcClient } from './rpc.js'
import type { RpcTransactionReceipt } from './types.js'

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
