import { useState, useCallback, useRef } from 'react'
import {
    deriveSecretFromCryptoKey,
    bytesToHex,
} from '@train-protocol/sdk'
import type { UserLockDetails } from '@train-protocol/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useTrainContext } from '../providers/TrainContext'
import { useSwapActions } from '../internal/useSwapActions'
import { useSDStoreContext } from '../providers/SecretDerivationProvider'
import { useWalletContext } from '../wallet/WalletContext'
import { trainQueryKeys } from '../internal/queryKeys'
import { caip2Id, parseCaip2Id } from '../internal/branded'
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
 */
export function useRevealSecret(): UseRevealSecretResult {
    const { apiClient, config } = useTrainContext()
    const actions = useSwapActions()
    const sdStore = useSDStoreContext()
    const walletCtx = useWalletContext()
    const queryClient = useQueryClient()
    const { networks, networkMap } = useNetworksContext()
    const [isRevealing, setIsRevealing] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const reveal = useCallback(async (hashlock: string) => {
        if (inFlight.current) return
        inFlight.current = true
        setIsRevealing(true)
        setError(null)

        const swap = actions.getSwap(hashlock)

        if (!swap?.hashlock) {
            const err = new TrainError('Cannot reveal: missing hashlock', TrainErrorCode.RevealFailed)
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
        if (!nonce && swap.source && swap.srcContract) {
            try {
                const sourceNetwork = caip2Id(swap.source)
                const sourceTokenDecimals = networkMap.get(swap.source)?.tokens.find(t => t.symbol == swap.source_asset)?.decimals
                if (!sourceTokenDecimals) return
                const client = walletCtx.createClient(sourceNetwork)
                const chainId = parseCaip2Id(sourceNetwork).reference
                const details = await client.getUserLockDetails({
                    id: swap.hashlock,
                    chainId,
                    decimals: sourceTokenDecimals,
                    contractAddress: swap.srcContract,
                    txId: swap.txId ?? undefined,
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
            const secretBytes = await deriveSecretFromCryptoKey(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))

            await apiClient.revealSecret(swap.hashlock, secret, swap.destinationSolverAddress)
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
