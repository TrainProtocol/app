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
import type { UserLockDetails } from '@train-protocol/sdk'

export interface RefundParams {
    hashlock: string
    /** Optional signer address. Refund is permissionless — any account can
     *  execute it. When provided, the bridge resolves the matching connector.
     *  When omitted, falls back to the framework's active account. */
    address?: string
}

export interface UseRefundResult {
    /** Refund locked funds. Params are passed at call time for freshness. */
    refund: (params: RefundParams) => Promise<string>
    isRefunding: boolean
    error: Error | null
}

/**
 * Action hook to refund locked funds after timelock expiry.
 *
 * Usage:
 * ```tsx
 * const { refund, isRefunding } = useRefund()
 * await refund({ hashlock, address })
 * ```
 */
export function useRefund(): UseRefundResult {
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const { networkMap } = useNetworksContext()
    const queryClient = useQueryClient()
    const [isRefunding, setIsRefunding] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const doRefund = useCallback(async (params: RefundParams): Promise<string> => {
        if (inFlight.current) throw new TrainError('Refund already in progress', TrainErrorCode.RefundFailed)
        inFlight.current = true
        setIsRefunding(true)
        setError(null)

        const { hashlock, address } = params
        const swapConfig = store?.getState().swapConfigs[hashlock]
        if (!swapConfig?.hashlock || !swapConfig?.srcContract) {
            const err = new TrainError('Cannot refund: missing required params', TrainErrorCode.RefundFailed)
            setError(err)
            inFlight.current = false
            setIsRefunding(false)
            throw err
        }

        const swapData = store?.getState().swaps[hashlock]
        const { sourceAsset } = resolveSwapTokens(swapData ?? undefined, networkMap)
        if (!sourceAsset) {
            const err = new TrainError('Cannot refund: unable to resolve source asset', TrainErrorCode.RefundFailed)
            setError(err)
            inFlight.current = false
            setIsRefunding(false)
            throw err
        }

        try {
            const client = walletCtx.createWriteClient(swapConfig.sourceNetwork, address)
            const chainId = swapConfig.origin === 'created'
                ? swapConfig.chainId
                : parseCaip2Id(swapConfig.sourceNetwork).reference
            const txHash = await client.refund({
                chainId,
                contractAddress: swapConfig.srcContract,
                id: swapConfig.hashlock,
                sourceAsset,
            })

            if (store) {
                store.getState().updateSwap(hashlock, { refundTxId: txHash })
            }

            return txHash
        } catch (err) {
            const trainError = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.RefundFailed, err)
            setError(trainError)
            if (store) store.getState().setActiveSwapError(hashlock, trainError)
            config.onError?.(trainError)
            throw trainError
        } finally {
            inFlight.current = false
            setIsRefunding(false)
        }
    }, [walletCtx, store, config, networkMap, queryClient])

    return { refund: doRefund, isRefunding, error }
}
