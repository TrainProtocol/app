import { useState, useCallback, useRef } from 'react'
import {
    deriveSecretFromTimelock,
    bytesToHex,
} from '@train-protocol/sdk'
import type { UserLockDetails } from '@train-protocol/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useTrainContext } from '../providers/TrainContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useSharedSecretDerivation } from '../providers/SecretDerivationProvider'
import { trainQueryKeys } from '../internal/queryKeys'
import { TrainError, TrainErrorCode } from '../types'

export interface UseRevealSecretResult {
    reveal: () => Promise<void>
    isRevealing: boolean
    error: Error | null
}

/**
 * Action hook to reveal the swap secret to the solver API.
 * Derives the secret on-demand from derivedKey + nonce (from sourceDetails.userData in React Query cache).
 *
 * @param hashlock - The hashlock of the swap whose secret to reveal
 */
export function useRevealSecret(hashlock: string | null | undefined): UseRevealSecretResult {
    const { apiClient, config } = useTrainContext()
    const store = useStoreContext()
    const { derivedKey } = useSharedSecretDerivation()
    const queryClient = useQueryClient()
    const [isRevealing, setIsRevealing] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const reveal = useCallback(async () => {
        if (inFlight.current) return
        inFlight.current = true
        setIsRevealing(true)
        setError(null)

        const hl = hashlock ?? null
        const swapConfig = hl ? store?.getState().swapConfigs[hl] : null

        // Recovered swaps don't have a solverId — cannot reveal secret
        if (swapConfig?.origin === 'recovered') {
            const err = new TrainError(
                'Cannot reveal secret for a recovered swap — solverId is unavailable. ' +
                'The solver must detect the secret from on-chain data.',
                TrainErrorCode.RevealFailed,
            )
            setError(err)
            inFlight.current = false
            setIsRevealing(false)
            throw err
        }

        // Get solverId — available for 'created' (always) and 'hydrated' (maybe)
        const solverId = swapConfig?.origin === 'created'
            ? swapConfig.solverId
            : swapConfig?.solverId

        if (!solverId || !swapConfig?.hashlock) {
            const err = new TrainError('Cannot reveal: missing solverId or hashlock', TrainErrorCode.RevealFailed)
            setError(err)
            inFlight.current = false
            setIsRevealing(false)
            throw err
        }

        // Derive secret on-demand from derivedKey + nonce
        if (!derivedKey) {
            const err = new TrainError('Cannot reveal: not logged in (derivedKey unavailable)', TrainErrorCode.RevealFailed)
            setError(err)
            inFlight.current = false
            setIsRevealing(false)
            throw err
        }

        // Point-in-time read is intentional here — this is a one-shot action, not a subscription
        const sourceDetails = queryClient.getQueryData<UserLockDetails | null>(trainQueryKeys.userLock(hl!))
        const nonce = sourceDetails?.userData ? Number(sourceDetails.userData) : null
        if (!nonce || isNaN(nonce)) {
            const err = new TrainError('Cannot reveal: nonce unavailable from source lock data', TrainErrorCode.RevealFailed)
            setError(err)
            inFlight.current = false
            setIsRevealing(false)
            throw err
        }

        try {
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))

            await apiClient.revealSecret(solverId, swapConfig.hashlock, secret)
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
    }, [hashlock, apiClient, store, config, derivedKey, queryClient])

    return { reveal, isRevealing, error }
}
