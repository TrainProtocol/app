import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    deriveSecretFromTimelock,
    secretToHashlock,
    bytesToHex,
    toHex32,
} from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useNetworksContext } from '../providers/NetworksProvider'
import { useSwapActions } from '../internal/useSwapActions'
import { useSDStoreContext } from '../providers/SecretDerivationProvider'
import { caip2Id, parseCaip2Id } from '../internal/branded'
import { normalizeHex } from '../internal/normalizeHex'
import { resolveSwapTokens } from '../internal/resolveSwapTokens'
import { trainQueryKeys } from '../internal/queryKeys'
import { TrainError, TrainErrorCode } from '../types'
import type { SolverLockDetails, UserLockDetails } from '@train-protocol/sdk'

export interface ManualClaimParams {
    hashlock: string
    /** Secret as 0x-hex. Optional — when omitted, it's resolved from the on-chain
     *  source lock (present once the solver redeemed it) or re-derived from the
     *  logged-in identity key and the lock's nonce. */
    secret?: string
    /** Optional signer address. Manual claim is permissionless — any account
     *  can execute it. When provided, the bridge resolves the matching connector.
     *  When omitted, falls back to the framework's active account. */
    address?: string
}

export interface UseManualClaimResult {
    /** Claim funds on the destination chain. Params are passed at call time for freshness. */
    claim: (params: ManualClaimParams) => Promise<string>
    isClaiming: boolean
    error: Error | null
}

/**
 * Action hook to manually claim (redeem) funds on the destination chain.
 */
export function useManualClaim(): UseManualClaimResult {
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const actions = useSwapActions()
    const sdStore = useSDStoreContext()
    const { networkMap } = useNetworksContext()
    const queryClient = useQueryClient()
    const [isClaiming, setIsClaiming] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const claim = useCallback(async (params: ManualClaimParams): Promise<string> => {
        if (inFlight.current) throw new TrainError('Claim already in progress', TrainErrorCode.ClaimFailed)
        inFlight.current = true
        setIsClaiming(true)
        setError(null)

        const { hashlock, address } = params
        const swap = actions.getSwap(hashlock)

        if (!swap?.hashlock || !swap?.destination || !swap?.destContract || !swap?.destinationAddress) {
            const err = new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        let secret = params.secret
        if (!secret) {
            const sourceDetails = queryClient.getQueryData<UserLockDetails | null>(trainQueryKeys.userLock(hashlock))
            if (sourceDetails?.secret) {
                secret = toHex32(sourceDetails.secret)
            } else {
                const derivedKey = sdStore?.getState().derivedKey
                const nonce = sourceDetails?.userData ? Number(sourceDetails.userData) : null
                if (derivedKey && nonce && !isNaN(nonce)) {
                    const candidate = bytesToHex(Array.from(deriveSecretFromTimelock(derivedKey, nonce)))
                    if (normalizeHex(secretToHashlock(candidate)) === normalizeHex(swap.hashlock)) {
                        secret = candidate
                    }
                }
            }
        }
        if (!secret) {
            const err = new TrainError(
                'Cannot claim: secret unavailable — log in with the identity that created this swap',
                TrainErrorCode.ClaimFailed,
            )
            setError(err)
            actions.updateSwapFlags(hashlock, { error: err })
            config.onError?.(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        // The lock is keyed by (hashlock, solver), so the observed lock's sender is the
        // only address that can address it on-chain. Fall back to the quoted solver when
        // the polled details aren't cached (e.g. after a reload straight into a claim).
        const solverLockDetails = queryClient.getQueryData<SolverLockDetails | null>(trainQueryKeys.solverLock(hashlock))
        const solverAddress = solverLockDetails?.sender || swap.destinationSolverAddress
        if (!solverAddress) {
            const err = new TrainError('Cannot claim: solver lock details unavailable', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        const { sourceAsset, destinationAsset } = resolveSwapTokens(swap, networkMap)
        if (!sourceAsset || !destinationAsset) {
            const err = new TrainError('Cannot claim: unable to resolve assets', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        try {
            const destNetwork = caip2Id(swap.destination)
            const client = walletCtx.createWriteClient(destNetwork, address)
            const chainId = parseCaip2Id(destNetwork).reference
            const txHash = await client.redeemSolver({
                chainId,
                contractAddress: swap.destContract,
                id: swap.hashlock,
                secret,
                destinationAddress: swap.destinationAddress,
                destinationAsset,
                sourceAsset,
                solverAddress,
            })

            actions.updateSwap(hashlock, { destTxId: txHash })

            return txHash
        } catch (err) {
            const trainError = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.ClaimFailed, err)
            setError(trainError)
            actions.updateSwapFlags(hashlock, { error: trainError })
            config.onError?.(trainError)
            throw trainError
        } finally {
            inFlight.current = false
            setIsClaiming(false)
        }
    }, [walletCtx, actions, sdStore, config, networkMap, queryClient])

    return { claim, isClaiming, error }
}
