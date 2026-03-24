import { useState, useCallback, useRef } from 'react'
import { useTrainContext } from '../providers/TrainContext'
import { useStoreContext } from '../providers/TrainProvider'
import { TrainError, TrainErrorCode } from '../types'

export interface UseRevealSecretResult {
    reveal: () => Promise<void>
    isRevealing: boolean
    error: Error | null
}

/**
 * Action hook to reveal the swap secret to the solver API.
 *
 * @param hashlock - The hashlock of the swap whose secret to reveal
 */
export function useRevealSecret(hashlock: string | null | undefined): UseRevealSecretResult {
    const { apiClient, config } = useTrainContext()
    const store = useStoreContext()
    const [isRevealing, setIsRevealing] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const reveal = useCallback(async () => {
        if (inFlight.current) return
        inFlight.current = true
        setIsRevealing(true)
        setError(null)

        const hl = hashlock ?? null
        const swap = hl ? store?.getState().activeSwaps[hl] : null
        if (!swap?.solverId || !swap?.hashlock || !swap?.secret) {
            const err = new TrainError('Cannot reveal: missing solverId, hashlock, or secret', TrainErrorCode.RevealFailed)
            setError(err)
            inFlight.current = false
            setIsRevealing(false)
            throw err
        }

        try {
            await apiClient.revealSecret(swap.solverId, swap.hashlock, swap.secret)
            if (store && hl) {
                store.getState().setSecretRevealedToApi(hl)
                store.getState().updateSwap(hl, { secretRevealed: true })
            }
        } catch (err) {
            const trainError = new TrainError(
                err instanceof Error ? err.message : String(err),
                TrainErrorCode.RevealFailed,
                err,
            )
            setError(trainError)
            if (store && hl) store.getState().setActiveSwapError(hl, trainError)
            config.onError?.(trainError)
            throw trainError
        } finally {
            inFlight.current = false
            setIsRevealing(false)
        }
    }, [hashlock, apiClient, store, config])

    return { reveal, isRevealing, error }
}
