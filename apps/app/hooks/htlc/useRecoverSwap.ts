import { useCallback, useState } from 'react'
import { Network } from '@/Models/Network'
import { useSwapStore } from '@/stores/swapStore'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import { recoverSwapFromChain } from '@/lib/htlc/recoverSwapFromChain'

export default function useRecoverSwap(sourceNetwork: Network | null) {
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)
    const recoverSwap = useSwapStore(s => s.recoverSwap)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const recover = useCallback(async (txHash: string): Promise<string> => {
        if (!sourceNetwork) {
            throw new Error('No client available for this network')
        }
        setError(null)
        setLoading(true)
        try {
            return await recoverSwapFromChain(sourceNetwork, txHash, networks, getEffectiveRpcUrls, recoverSwap)
        } catch (e: any) {
            const message = e?.shortMessage || e?.message || 'Failed to recover swap'
            setError(message)
            throw e
        } finally {
            setLoading(false)
        }
    }, [sourceNetwork, networks, recoverSwap, getEffectiveRpcUrls])

    return { recover, loading, error, setError }
}
