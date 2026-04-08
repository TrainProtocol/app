import { useState, useCallback, useRef } from 'react'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useNetworksContext } from '../providers/NetworksProvider'
import { useSwapActions } from '../internal/useSwapActions'
import { caip2Id, parseCaip2Id } from '../internal/branded'
import { resolveSwapTokens } from '../internal/resolveSwapTokens'
import { TrainError, TrainErrorCode } from '../types'

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
 */
export function useRefund(): UseRefundResult {
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const actions = useSwapActions()
    const { networkMap } = useNetworksContext()
    const [isRefunding, setIsRefunding] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const doRefund = useCallback(async (params: RefundParams): Promise<string> => {
        if (inFlight.current) throw new TrainError('Refund already in progress', TrainErrorCode.RefundFailed)
        inFlight.current = true
        setIsRefunding(true)
        setError(null)

        const { hashlock, address } = params
        const swap = actions.getSwap(hashlock)
        if (!swap?.hashlock || !swap?.srcContract || !swap?.source) {
            const err = new TrainError('Cannot refund: missing required params', TrainErrorCode.RefundFailed)
            setError(err)
            inFlight.current = false
            setIsRefunding(false)
            throw err
        }

        const { sourceAsset } = resolveSwapTokens(swap, networkMap)
        if (!sourceAsset) {
            const err = new TrainError('Cannot refund: unable to resolve source asset', TrainErrorCode.RefundFailed)
            setError(err)
            inFlight.current = false
            setIsRefunding(false)
            throw err
        }

        try {
            const sourceNetwork = caip2Id(swap.source)
            const client = walletCtx.createWriteClient(sourceNetwork, address)
            const chainId = parseCaip2Id(sourceNetwork).reference
            const txHash = await client.refund({
                chainId,
                contractAddress: swap.srcContract,
                id: swap.hashlock,
                sourceAsset,
            })

            actions.updateSwap(hashlock, { refundTxId: txHash })

            return txHash
        } catch (err) {
            const trainError = err instanceof TrainError
                ? err
                : new TrainError(err instanceof Error ? err.message : String(err), TrainErrorCode.RefundFailed, err)
            setError(trainError)
            actions.updateSwapFlags(hashlock, { error: trainError })
            config.onError?.(trainError)
            throw trainError
        } finally {
            inFlight.current = false
            setIsRefunding(false)
        }
    }, [walletCtx, actions, config, networkMap])

    return { refund: doRefund, isRefunding, error }
}
