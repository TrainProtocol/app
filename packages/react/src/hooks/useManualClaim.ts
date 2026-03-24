import { useState, useCallback } from 'react'
import { HTLCStatus } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
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
    const derived = useDerivedSwapState(store, hl)
    const [isClaiming, setIsClaiming] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const canClaim = derived.status === HTLCStatus.ManualClaimRequired

    const claim = useCallback(async (secret: string): Promise<string> => {
        setIsClaiming(true)
        setError(null)

        const swap = hl ? store?.getState().activeSwaps[hl] : null
        const dstNamespace = swap?.destinationNetwork?.split(':')[0] ?? null
        const chainId = swap?.destinationNetwork?.split(':')[1]
        if (!swap?.hashlock || !dstNamespace || !swap?.destinationNetwork || !swap?.destContract || !swap.destinationAddress || !chainId || !swap.solverLockDetails || !swap.destinationAsset || !swap.sourceAsset) {
            const err = new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
            setError(err)
            setIsClaiming(false)
            throw err
        }

        try {
            const signer = walletCtx.getSignerForNetwork(swap.destinationNetwork)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${dstNamespace}`, TrainErrorCode.WalletNotConnected)
            }
            const solverIndex = swap.solverLockDetails.index
            const adapterConfig = walletCtx.getClientConfigForNetwork(swap.destinationNetwork)
            const client = sdk.createHTLCClient(dstNamespace, { ...adapterConfig, signer } as any)
            const txHash = await client.redeemSolver({
                chainId,
                contractAddress: swap.destContract,
                id: swap.hashlock,
                secret,
                destinationAddress: swap.destinationAddress,
                destinationAsset: swap.destinationAsset,
                sourceAsset: swap.sourceAsset,
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
    }, [hl, walletCtx, sdk, store, config])

    return { claim, isClaiming, canClaim, error }
}
