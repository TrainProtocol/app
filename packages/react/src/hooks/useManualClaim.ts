import { useState, useCallback } from 'react'
import { HTLCStatus } from '@train-protocol/sdk'
import type { SolverLockDetails } from '@train-protocol/sdk'
import { useQueryClient } from '@tanstack/react-query'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
import { trainQueryKeys } from '../internal/queryKeys'
import { TrainError, TrainErrorCode } from '../types'

export interface UseManualClaimResult {
    claim: (secret: string) => Promise<string>
    isClaiming: boolean
    canClaim: boolean
    error: Error | null
}

/**
 * Action hook to manually claim (redeem) funds on the destination chain.
 *
 * @param hashlock - The hashlock of the swap to claim
 */
export function useManualClaim(hashlock: string | null | undefined): UseManualClaimResult {
    const hl = hashlock ?? null
    const { config, sdk } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const queryClient = useQueryClient()
    const derived = useDerivedSwapState(store, hl)
    const [isClaiming, setIsClaiming] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const canClaim = derived.status === HTLCStatus.ManualClaimRequired

    const claim = useCallback(async (secret: string): Promise<string> => {
        setIsClaiming(true)
        setError(null)

        const swapConfig = hl ? store?.getState().swapConfigs[hl] : null
        const solverLockDetails = hl
            ? queryClient.getQueryData<SolverLockDetails | null>(trainQueryKeys.solverLock(hl))
            : null
        const dstNamespace = swapConfig?.destinationNetwork?.split(':')[0] ?? null
        const chainId = swapConfig?.destinationNetwork?.split(':')[1]
        if (!swapConfig?.hashlock || !dstNamespace || !swapConfig?.destinationNetwork || !swapConfig?.destContract || !swapConfig.destinationAddress || !chainId || !solverLockDetails || !swapConfig.destinationAsset || !swapConfig.sourceAsset) {
            const err = new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
            setError(err)
            setIsClaiming(false)
            throw err
        }

        try {
            const signer = walletCtx.getSignerForNetwork(swapConfig.destinationNetwork)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${dstNamespace}`, TrainErrorCode.WalletNotConnected)
            }
            const solverIndex = solverLockDetails.index
            const adapterConfig = walletCtx.getClientConfigForNetwork(swapConfig.destinationNetwork)
            const client = sdk.createHTLCClient(dstNamespace, { ...adapterConfig, signer } as any)
            const txHash = await client.redeemSolver({
                chainId,
                contractAddress: swapConfig.destContract,
                id: swapConfig.hashlock,
                secret,
                destinationAddress: swapConfig.destinationAddress,
                destinationAsset: swapConfig.destinationAsset,
                sourceAsset: swapConfig.sourceAsset,
                index: solverIndex
            })

            if (store && hl) {
                store.getState().updateSwap(hl, { destTxId: txHash })
            }

            return txHash
        } catch (err) {
            const trainError = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.ClaimFailed, err)
            setError(trainError)
            if (store && hl) store.getState().setActiveSwapError(hl, trainError)
            config.onError?.(trainError)
            throw trainError
        } finally {
            setIsClaiming(false)
        }
    }, [hl, walletCtx, sdk, store, config, queryClient])

    return { claim, isClaiming, canClaim, error }
}
