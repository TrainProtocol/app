import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useNetworksContext } from '../providers/NetworksProvider'
import { parseCaip2Id } from '../internal/branded'
import { resolveSwapTokens } from '../internal/resolveSwapTokens'
import { trainQueryKeys } from '../internal/queryKeys'
import { TrainError, TrainErrorCode } from '../types'
import type { SolverLockDetails } from '@train-protocol/sdk'

export interface ManualClaimParams {
    hashlock: string
    secret: string
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
 *
 * Usage:
 * ```tsx
 * const { claim, isClaiming } = useManualClaim()
 * await claim({ hashlock, secret, address })
 * ```
 */
export function useManualClaim(): UseManualClaimResult {
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
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

        const { hashlock, secret, address } = params
        const swapConfig = store?.getState().swapConfigs[hashlock]

        // Manual claim requires destContract — only available for created/hydrated swaps
        const destContract = swapConfig?.origin !== 'recovered'
            ? swapConfig?.destContract ?? null
            : null

        if (!swapConfig?.hashlock || !swapConfig?.destinationNetwork || !destContract || !swapConfig.destinationAddress) {
            const err = new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        const solverLockDetails = queryClient.getQueryData<SolverLockDetails | null>(trainQueryKeys.solverLock(hashlock))
        if (!solverLockDetails) {
            const err = new TrainError('Cannot claim: solver lock details unavailable', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        const swapData = store?.getState().swaps[hashlock]
        const { sourceAsset, destinationAsset } = resolveSwapTokens(swapData ?? undefined, networkMap)
        if (!sourceAsset || !destinationAsset) {
            const err = new TrainError('Cannot claim: unable to resolve assets', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        try {
            const client = walletCtx.createWriteClient(swapConfig.destinationNetwork, address)
            const chainId = parseCaip2Id(swapConfig.destinationNetwork).reference
            const txHash = await client.redeemSolver({
                chainId,
                contractAddress: destContract,
                id: swapConfig.hashlock,
                secret,
                destinationAddress: swapConfig.destinationAddress,
                destinationAsset,
                sourceAsset,
                index: solverLockDetails.index,
            })

            if (store) {
                store.getState().updateSwap(hashlock, { destTxId: txHash })
            }

            return txHash
        } catch (err) {
            const trainError = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.ClaimFailed, err)
            setError(trainError)
            if (store) store.getState().setActiveSwapError(hashlock, trainError)
            config.onError?.(trainError)
            throw trainError
        } finally {
            inFlight.current = false
            setIsClaiming(false)
        }
    }, [walletCtx, store, config, networkMap, queryClient])

    return { claim, isClaiming, error }
}
