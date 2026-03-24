import { Network } from '@/Models/Network'
import { SwapData } from '@/stores/swapStore'
import { createHTLCClient } from './createHTLCClient'
import formatAmount from '@/lib/formatAmount'

export async function recoverSwapFromChain(
    sourceNetwork: Network,
    txHash: string,
    networks: Network[],
    getEffectiveRpcUrls: (network: Network) => string[],
    recoverSwap: (hashlock: string, data: SwapData) => void,
): Promise<string> {
    const client = createHTLCClient(sourceNetwork, getEffectiveRpcUrls)
    const data = await client.recoverSwap(txHash)

    const sourceNet = networks.find(n => n.caip2Id === data.srcChain)
    const destNet = networks.find(n => n.caip2Id === data.dstChain)
    if (!sourceNet || !destNet) {
        throw new Error('Source or destination network not supported')
    }

    const sourceToken = sourceNet.tokens.find(
        t => t.contractAddress?.toLowerCase() === data.token?.toLowerCase()
    )
    const destToken = destNet.tokens.find(
        t => t.symbol === data.dstToken || t.contractAddress?.toLowerCase() === data.dstToken?.toLowerCase()
    )
    const destContract = destNet.contracts?.find(c => c.type === 'Train')?.address

    const swapData: SwapData = {
        requestedAmount: formatAmount(data.amount, sourceToken?.decimals ?? 18).toString(),
        address: data.dstAddress,
        source: sourceNet.caip2Id,
        destination: destNet.caip2Id,
        source_asset: sourceToken?.symbol ?? '',
        destination_asset: destToken?.symbol ?? data.dstToken ?? '',
        //TODO: remove this once we can get the solver name from the backend
        solver: 'plorex',
        srcContract: data.srcContract,
        destContract,
        receiveAmount: formatAmount(data.dstAmount, destToken?.decimals ?? 18).toString(),
        hashlock: data.hashlock,
        txId: txHash,
    }

    recoverSwap(data.hashlock, swapData)
    return data.hashlock
}
