import { useState, useCallback, useRef } from 'react'
import { HTLCStatus } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
import { parseCaip2Id } from '../internal/branded'
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
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const derived = useDerivedSwapState(store, hl)
    const [isClaiming, setIsClaiming] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const canClaim = derived.status === HTLCStatus.ManualClaimRequired

    const claim = useCallback(async (secret: string): Promise<string> => {
        if (inFlight.current) throw new TrainError('Claim already in progress', TrainErrorCode.ClaimFailed)
        inFlight.current = true
        setIsClaiming(true)
        setError(null)

        const swapConfig = hl ? store?.getState().swapConfigs[hl] : null
        const solverLockDetails = derived.solverLockDetails

        // Manual claim requires destContract — only available for created/hydrated swaps
        const destContract = swapConfig?.origin !== 'recovered'
            ? swapConfig?.destContract ?? null
            : null

        if (!swapConfig?.hashlock || !swapConfig?.destinationNetwork || !destContract || !swapConfig.destinationAddress || !solverLockDetails) {
            const err = new TrainError('Cannot claim: missing required params', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        const sourceAsset = derived.sourceToken
        const destinationAsset = derived.destinationToken
        if (!sourceAsset || !destinationAsset) {
            const err = new TrainError('Cannot claim: unable to resolve assets', TrainErrorCode.ClaimFailed)
            setError(err)
            inFlight.current = false
            setIsClaiming(false)
            throw err
        }

        try {
            // Create write client via wallet adapter (fully typed, no cast)
            const client = walletCtx.createWriteClient(swapConfig.destinationNetwork)
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
            inFlight.current = false
            setIsClaiming(false)
        }
    }, [hl, walletCtx, store, config, derived.sourceToken, derived.destinationToken, derived.solverLockDetails])

    return { claim, isClaiming, canClaim, error }
}
