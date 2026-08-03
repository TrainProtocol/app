import { useState, useCallback, useRef } from 'react'
import {
    deriveSecretFromTimelock,
    secretToHashlock,
    bytesToHex,
} from '@train-protocol/sdk'
import type { SolverLockDetails, UserLockDetails } from '@train-protocol/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useTrainContext } from '../providers/TrainContext'
import { useSwapActions } from '../internal/useSwapActions'
import { useSDStoreContext } from '../providers/SecretDerivationProvider'
import { useWalletContext } from '../wallet/WalletContext'
import { trainQueryKeys } from '../internal/queryKeys'
import { caip2Id, parseCaip2Id } from '../internal/branded'
import { normalizeHex } from '../internal/normalizeHex'
import { TrainError, TrainErrorCode } from '../types'
import { useNetworksContext } from '../providers/NetworksProvider'
import { resolveSolverLockVerification } from '../internal/resolveSolverLockVerification'
import { resolveSwapTokens } from '../internal/resolveSwapTokens'
import { REVEAL_MAX_ATTEMPTS, REVEAL_RETRY_DELAY_MS, sleep } from '../internal/timing'

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
 * Refuses to send unless RPC consensus is verified and the solver lock still matches the
 * original quote, re-checked at call time. Callers may gate for UX, but need not for safety.
 */
export function useRevealSecret(): UseRevealSecretResult {
    const { apiClient, config } = useTrainContext()
    const actions = useSwapActions()
    const sdStore = useSDStoreContext()
    const walletCtx = useWalletContext()
    const queryClient = useQueryClient()
    const { networkMap } = useNetworksContext()
    const [isRevealing, setIsRevealing] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    // `reveal` is a dependency of the caller's auto-reveal effect, so its identity must not
    // change when the networks query refetches — that would re-fire an irreversible action on
    // unrelated data churn. A latest-value ref keeps the map current without destabilizing the
    // callback; closing over it directly would pin whichever map existed at first render, and an
    // empty one makes the verification gate below refuse every reveal as 'skipped'.
    const networkMapRef = useRef(networkMap)
    networkMapRef.current = networkMap

    const reveal = useCallback(async (hashlock: string) => {
        if (inFlight.current) return
        inFlight.current = true
        setIsRevealing(true)
        setError(null)

        // Pin one snapshot for the whole call: the token decimals read before the on-chain
        // fallback and the network/token fed to the gate afterwards must describe the same
        // network list, even if a refetch lands mid-await.
        const networks = networkMapRef.current

        const reportError = (message: string, code = TrainErrorCode.RevealFailed): TrainError => {
            const err = new TrainError(message, code)
            setError(err)
            actions.updateSwapFlags(hashlock, { error: err })
            config.onError?.(err)
            inFlight.current = false
            setIsRevealing(false)
            return err
        }

        const swap = actions.getSwap(hashlock)
        if (!swap || !swap.hashlock) {
            throw reportError('Cannot reveal: missing hashlock')
        }

        // Derive secret on-demand from derivedKey + nonce
        const derivedKey = sdStore?.getState().derivedKey
        if (!derivedKey) {
            throw reportError('Cannot reveal: not logged in (derivedKey unavailable)')
        }

        // Resolve the source lock: the nonce derives the secret, and the same details feed
        // the verification gate below.
        let nonce: number | null = null

        // Tier 1: React Query cache (fast path — works when polling is active)
        let sourceDetails = queryClient.getQueryData<UserLockDetails | null>(trainQueryKeys.userLock(hashlock)) ?? null
        const cachedNonce = sourceDetails?.userData ? Number(sourceDetails.userData) : null
        if (cachedNonce && !isNaN(cachedNonce)) {
            nonce = cachedNonce
        }

        // Tier 2: on-chain RPC fallback (cache was GC'd or not yet populated)
        if (!nonce && swap.source && swap.srcContract) {
            const sourceNetwork = caip2Id(swap.source)
            const sourceTokenDecimals = networks.get(swap.source)?.tokens.find(t => t.symbol == swap.source_asset)?.decimals
            if (!sourceTokenDecimals) {
                throw reportError('Cannot reveal: source token decimals unavailable')
            }
            try {
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
                    sourceDetails = details
                }
            } catch {
                // RPC failure — fall through to the nonce-unavailable error below
            }
        }

        if (!nonce) {
            throw reportError('Cannot reveal: nonce unavailable from cache or on-chain data')
        }

        // Handing over the secret is irreversible, so the preconditions live here rather than
        // in the callers: the lock can go stale (expire, be refunded, be replaced) between the
        // verdict a caller saw and this call — a retry after a failed reveal most of all.
        const flags = actions.getSwapFlags(hashlock)
        if (flags?.consensusPhase !== 'verified') {
            throw reportError(
                'Cannot reveal: the solver lock has not passed RPC consensus verification',
                TrainErrorCode.VerificationFailed,
            )
        }

        const { verified, skipped, mismatches } = resolveSolverLockVerification({
            solverLockDetails: queryClient.getQueryData<SolverLockDetails | null>(trainQueryKeys.solverLock(hashlock)),
            sourceDetails,
            destinationAddress: swap.destinationAddress ?? swap.address,
            destinationSolverAddress: swap.destinationSolverAddress,
            destinationNetwork: swap.destination ? networks.get(swap.destination) : null,
            destinationToken: resolveSwapTokens(swap, networks).destinationAsset,
        })
        if (!verified) {
            const reason = mismatches.length
                ? `does not match the original quote (${mismatches.join('; ')})`
                : skipped
                    ? 'cannot be checked against the original quote'
                    : 'is unavailable'
            throw reportError(`Cannot reveal: the solver lock ${reason}`, TrainErrorCode.VerificationFailed)
        }

        try {
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))

            if (normalizeHex(secretToHashlock(secret)) !== normalizeHex(swap.hashlock)) {
                throw new TrainError(
                    'Cannot reveal: current login does not match the identity that created this swap',
                    TrainErrorCode.RevealFailed,
                )
            }

            // The POST itself is the flaky part — a network blip, or the solver not yet serving
            // the order it just locked against. Re-sending the same secret for the same hashlock
            // is idempotent, so absorb those instead of putting a dead-end error on screen: the
            // gates above have already passed, and nothing they check can change within a second.
            let lastError: unknown
            for (let attempt = 1; attempt <= REVEAL_MAX_ATTEMPTS; attempt++) {
                try {
                    await apiClient.revealSecret(swap.hashlock, secret, swap.destinationSolverAddress)
                    lastError = undefined
                    break
                } catch (err) {
                    lastError = err
                    if (attempt < REVEAL_MAX_ATTEMPTS) {
                        console.warn(`[RevealSecret] attempt ${attempt}/${REVEAL_MAX_ATTEMPTS} failed, retrying in ${REVEAL_RETRY_DELAY_MS}ms`, err)
                        await sleep(REVEAL_RETRY_DELAY_MS)
                    }
                }
            }
            if (lastError) {
                throw new TrainError(
                    `Reveal failed after ${REVEAL_MAX_ATTEMPTS} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
                    TrainErrorCode.RevealFailed,
                    lastError,
                )
            }

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
