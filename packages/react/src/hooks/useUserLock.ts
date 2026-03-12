import { useState, useCallback } from 'react'
import { useSwapContext } from '../providers/SwapProvider'
import type { StartSwapParams } from '../types'

export interface UseUserLockResult {
    lock: (params: StartSwapParams, derivedKey: Buffer) => Promise<void>
    isLocking: boolean
    error: Error | null
}

export function useUserLock(): UseUserLockResult {
    const { startSwap } = useSwapContext()
    const [isLocking, setIsLocking] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const lock = useCallback(async (params: StartSwapParams, derivedKey: Buffer) => {
        setIsLocking(true)
        setError(null)
        try {
            await startSwap(params, derivedKey)
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
            throw err
        } finally {
            setIsLocking(false)
        }
    }, [startSwap])

    return { lock, isLocking, error }
}
