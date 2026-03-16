import { useState, useCallback } from 'react'
import { useSwapContext } from '../providers/SwapProvider'
import { RecoveredSwapData } from '@train-protocol/sdk'

export interface UseRecoverSwapResult {
    recover: (txHash: string, chainNamespace: string, rpcUrl: string) => Promise<RecoveredSwapData>
    isRecovering: boolean
    error: Error | null
}

export function useRecoverSwap(): UseRecoverSwapResult {
    const { recoverSwap } = useSwapContext()
    const [isRecovering, setIsRecovering] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const recover = useCallback(async (txHash: string, chainNamespace: string, rpcUrl: string) => {
        setIsRecovering(true)
        setError(null)
        try {
            return await recoverSwap(txHash, chainNamespace, rpcUrl)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
            throw err
        } finally {
            setIsRecovering(false)
        }
    }, [recoverSwap])

    return { recover, isRecovering, error }
}
