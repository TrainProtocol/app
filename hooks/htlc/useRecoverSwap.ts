import { useCallback, useState } from 'react'
import formatAmount from '../../lib/formatAmount'
import { Network } from '../../Models/Network'
import { SwapData, useSwapStore } from '../../stores/swapStore'
import { useSettingsState } from '../../context/settings'
import useWallet from '../useWallet'

export default function useRecoverSwap(sourceNetwork: Network | null) {
    const { networks } = useSettingsState()
    const { provider } = useWallet(sourceNetwork ?? undefined, 'withdrawal')
    const recoverSwap = useSwapStore(s => s.recoverSwap)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const recover = useCallback(async (txHash: string): Promise<string> => {
        if (!provider?.recoverSwap || !sourceNetwork) {
            throw new Error('No provider available for this network')
        }

        setError(null)
        setLoading(true)

        try {
            const data = await provider.recoverSwap(txHash, sourceNetwork.chainId)

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
                source: sourceNet.slug,
                destination: destNet.slug,
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
    }, [provider, sourceNetwork, networks, recoverSwap])

    return { recover, loading, error, setError }
}
