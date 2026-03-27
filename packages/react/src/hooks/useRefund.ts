import { useState, useCallback } from 'react'
import { HTLCStatus } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
import { parseCaip2Id } from '../internal/branded'
import { getLockType } from '../internal/getLockType'
import { TrainError, TrainErrorCode } from '../types'

export interface UseRefundResult {
    refund: () => Promise<string>
    isRefunding: boolean
    canRefund: boolean
    error: Error | null
}

/**
 * Action hook to refund locked funds after timelock expiry.
 *
 * @param hashlock - The hashlock of the swap to refund
 */
export function useRefund(hashlock: string | null | undefined): UseRefundResult {
    const hl = hashlock ?? null
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const derived = useDerivedSwapState(store, hl)
    const [isRefunding, setIsRefunding] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const canRefund = derived.isTimelockExpired && derived.status === HTLCStatus.TimelockExpired

    const doRefund = useCallback(async (): Promise<string> => {
        setIsRefunding(true)
        setError(null)

        const swapConfig = hl ? store?.getState().swapConfigs[hl] : null
        if (!swapConfig?.hashlock || !swapConfig?.srcContract) {
            const err = new TrainError('Cannot refund: missing required params', TrainErrorCode.RefundFailed)
            setError(err)
            setIsRefunding(false)
            throw err
        }

        const sourceAsset = derived.sourceToken
        if (!sourceAsset) {
            const err = new TrainError('Cannot refund: unable to resolve source asset', TrainErrorCode.RefundFailed)
            setError(err)
            setIsRefunding(false)
            throw err
        }

        try {
            // Create write client via wallet adapter (fully typed, no cast)
            const client = walletCtx.createWriteClient(swapConfig.sourceNetwork)
            const chainId = swapConfig.origin === 'created'
                ? swapConfig.chainId
                : parseCaip2Id(swapConfig.sourceNetwork).reference
            const txHash = await client.refund({
                type: getLockType(swapConfig.origin === 'created' ? swapConfig.tokenContractAddress : null),
                chainId,
                contractAddress: swapConfig.srcContract,
                id: swapConfig.hashlock,
                sourceAsset,
            })

            if (store && hl) {
                store.getState().updateSwap(hl, { refundTxId: txHash })
            }

            return txHash
        } catch (err) {
            const trainError = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.RefundFailed, err)
            setError(trainError)
            if (store && hl) store.getState().setActiveSwapError(hl, trainError)
            config.onError?.(trainError)
            throw trainError
        } finally {
            setIsRefunding(false)
        }
    }, [hl, walletCtx, store, config, derived.sourceToken])

    return { refund: doRefund, isRefunding, canRefund, error }
}
