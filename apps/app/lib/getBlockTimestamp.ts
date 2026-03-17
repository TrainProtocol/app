import { createAztecNodeClient } from '@aztec/aztec.js/node'
import { TxHash } from '@aztec/aztec.js/tx'

async function jsonRpc(rpcUrl: string, method: string, params: unknown[]): Promise<any> {
    const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })
    const json = await res.json()
    return json.result ?? null
}

async function getEvmBlockTimestamp(rpcUrl: string, txHash: string): Promise<number | null> {
    const receipt = await jsonRpc(rpcUrl, 'eth_getTransactionReceipt', [txHash])
    if (!receipt?.blockNumber) return null

    const block = await jsonRpc(rpcUrl, 'eth_getBlockByNumber', [receipt.blockNumber, false])
    if (!block?.timestamp) return null

    return Number(BigInt(block.timestamp)) * 1000
}

async function getSolanaBlockTimestamp(rpcUrl: string, txHash: string): Promise<number | null> {
    const tx = await jsonRpc(rpcUrl, 'getTransaction', [txHash, { encoding: 'json', maxSupportedTransactionVersion: 0 }])
    return tx?.blockTime ? tx.blockTime * 1000 : null
}

async function getStarknetBlockTimestamp(rpcUrl: string, txHash: string): Promise<number | null> {
    const receipt = await jsonRpc(rpcUrl, 'starknet_getTransactionReceipt', [txHash])
    if (!receipt?.block_number) return null

    const block = await jsonRpc(rpcUrl, 'starknet_getBlockWithTxHashes', [{ block_number: receipt.block_number }])
    return block?.timestamp ? block.timestamp * 1000 : null
}

async function getAztecBlockTimestamp(rpcUrl: string, txHash: string): Promise<number | null> {
    const node = createAztecNodeClient(rpcUrl)
    const receipt = await node.getTxReceipt(TxHash.fromString(txHash))
    if (!receipt?.blockNumber) return null

    const block = await node.getBlock(receipt.blockNumber)
    if (!block) return null

    return Number(block.header.globalVariables.timestamp) * 1000
}

export async function getBlockTimestampByTxHash(
    rpcUrl: string,
    txHash: string,
    caip2Id: string
): Promise<number | null> {
    try {
        const namespace = caip2Id.split(':')[0]

        switch (namespace) {
            case 'eip155':
                return await getEvmBlockTimestamp(rpcUrl, txHash)
            case 'solana':
                return await getSolanaBlockTimestamp(rpcUrl, txHash)
            case 'starknet':
                return await getStarknetBlockTimestamp(rpcUrl, txHash)
            case 'aztec':
                return await getAztecBlockTimestamp(rpcUrl, txHash)
            default:
                return null
        }
    } catch (e) {
        console.error('Error fetching block timestamp:', e)
        return null
    }
}
