import { useState, useCallback, useRef } from 'react'
import {
    deriveSecretFromTimelock,
    bytesToHex,
} from '@train-protocol/sdk'
import type { UserLockDetails } from '@train-protocol/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useTrainContext } from '../providers/TrainContext'
import { useSwapActions } from '../internal/useSwapActions'
import { useSDStoreContext } from '../providers/SecretDerivationProvider'
import { useWalletContext } from '../wallet/WalletContext'
import { trainQueryKeys } from '../internal/queryKeys'
import { parseCaip2Id } from '../internal/branded'
import { TrainError, TrainErrorCode } from '../types'
import { useNetworksContext } from '../providers/NetworksProvider'

export interface UseRevealSecretResult {
    /** Reveal the swap secret to the solver API. */
    reveal: (hashlock: string) => Promise<void>
    isRevealing: boolean
    error: Error | null
}

/**
 * Action hook to reveal the swap secret to the solver API.
 * Derives the secret on-demand from the internal key store + nonce
 * (from sourceDetails.userData in React Query cache).
 *
 * Usage:
 * ```tsx
 * const { reveal, isRevealing } = useRevealSecret()
 * await reveal(hashlock)
 * ```
 */
export function useRevealSecret(): UseRevealSecretResult {
    const { apiClient, config } = useTrainContext()
    const actions = useSwapActions()
    const sdStore = useSDStoreContext()
    const walletCtx = useWalletContext()
    const queryClient = useQueryClient()
    const { networks } = useNetworksContext()
    const [isRevealing, setIsRevealing] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const reveal = useCallback(async (hashlock: string) => {
        if (inFlight.current) return
        inFlight.current = true
        setIsRevealing(true)
        setError(null)

        const swapConfig = actions.getSwapConfig(hashlock)

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
        const derivedKey = sdStore?.getState().derivedKey
        if (!derivedKey) {
            const err = new TrainError('Cannot reveal: not logged in (derivedKey unavailable)', TrainErrorCode.RevealFailed)
            setError(err)
            inFlight.current = false
            setIsRevealing(false)
            throw err
        }

        // Resolve nonce: try cache first, fall back to on-chain read
        let nonce: number | null = null

        // Tier 1: React Query cache (fast path — works when polling is active)
        const sourceDetails = queryClient.getQueryData<UserLockDetails | null>(trainQueryKeys.userLock(hashlock))
        const cachedNonce = sourceDetails?.userData ? Number(sourceDetails.userData) : null
        if (cachedNonce && !isNaN(cachedNonce)) {
            nonce = cachedNonce
        }

        // Tier 2: on-chain RPC fallback (cache was GC'd or not yet populated)
        if (!nonce && swapConfig) {
            try {
                const sourceTokenDecimals = networks.find(n => n.caip2Id == swapConfig.sourceNetwork)?.tokens.find(t => t.contract == swapConfig.srcTokenContractAddress)?.decimals
                if (!sourceTokenDecimals) return
                const client = walletCtx.createClient(swapConfig.sourceNetwork)
                const chainId = swapConfig.origin === 'created'
                    ? swapConfig.chainId
                    : parseCaip2Id(swapConfig.sourceNetwork).reference
                const details = await client.getUserLockDetails({
                    id: swapConfig.hashlock,
                    chainId,
                    decimals: sourceTokenDecimals,
                    contractAddress: swapConfig.srcContract,
                    txId: swapConfig.txId ?? undefined,
                })
                const onChainNonce = details?.userData ? Number(details.userData) : null
                if (onChainNonce && !isNaN(onChainNonce)) {
                    nonce = onChainNonce
                }
            } catch {
                // Fall through to error below
            }
        }

        if (!nonce) {
            const err = new TrainError('Cannot reveal: nonce unavailable from cache or on-chain data', TrainErrorCode.RevealFailed)
            setError(err)
            inFlight.current = false
            setIsRevealing(false)
            throw err
        }

        try {
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))

            await apiClient.revealSecret(solverId, swapConfig.hashlock, secret)
            actions.updateSwapFlags(hashlock, { secretRevealedToApi: true })
            actions.updateSwap(hashlock, { secretRevealed: true })
        } catch (err) {
            const trainError = new TrainError(
                err instanceof Error ? err.message : String(err),
                TrainErrorCode.RevealFailed,
                err,
            )
            setError(trainError)
            actions.updateSwapFlags(hashlock, { error: trainError })
            config.onError?.(trainError)
            throw trainError
        } finally {
            inFlight.current = false
            setIsRevealing(false)
        }
    }, [apiClient, actions, sdStore, config, queryClient, walletCtx])

    return { reveal, isRevealing, error }
}
