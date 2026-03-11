import { useCallback, useMemo, useState } from 'react'
import formatAmount from '@/lib/formatAmount'
import { Network } from '@/Models/Network'
import { SwapData, useSwapStore } from '@/stores/swapStore'
import { useSettingsState } from '@/context/settings'
import { createHTLCClient } from '@/lib/htlc/createHTLCClient'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'

export default function useRecoverSwap(sourceNetwork: Network | null) {
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)
    const client = useMemo(() => {
        if (!sourceNetwork) return undefined
        try { return createHTLCClient(sourceNetwork, getEffectiveRpcUrls) }
        catch { return undefined }
    }, [sourceNetwork, getEffectiveRpcUrls])
    const recoverSwap = useSwapStore(s => s.recoverSwap)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const recover = useCallback(async (txHash: string): Promise<string> => {
        if (!client || !sourceNetwork) {
            throw new Error('No client available for this network')
        }

        setError(null)
        setLoading(true)

        try {
            const data = await client.recoverSwap(txHash as `0x${string}`)

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
                solver: data.recipient,
                srcContract: data.srcContract,
                destContract,
                receiveAmount: formatAmount(data.dstAmount, destToken?.decimals ?? 18).toString(),
                hashlock: data.hashlock,
                txId: txHash,
            }

            recoverSwap(data.hashlock, swapData)
            return data.hashlock
        } catch (e: any) {
            const message = e?.shortMessage || e?.message || 'Failed to recover swap'
            setError(message)
            throw e
        } finally {
            setLoading(false)
        }
    }, [client, sourceNetwork, networks, recoverSwap])

    return { recover, loading, error, setError }
}
