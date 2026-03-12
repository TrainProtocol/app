import { useState, useCallback } from 'react'
import { useSwapContext } from '../providers/SwapProvider'

export interface UseRevealSecretResult {
    reveal: () => Promise<void>
    isRevealing: boolean
    error: Error | null
}

export function useRevealSecret(): UseRevealSecretResult {
    const { revealSecret } = useSwapContext()
    const [isRevealing, setIsRevealing] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const reveal = useCallback(async () => {
        setIsRevealing(true)
        setError(null)
        try {
            await revealSecret()
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)))
            throw err
        } finally {
            setIsRevealing(false)
        }
    }, [revealSecret])

    return { reveal, isRevealing, error }
}
