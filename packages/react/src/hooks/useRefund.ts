import { useState, useCallback, useSyncExternalStore } from 'react'
import { HTLCStatus } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useDerivedSwapState } from '../internal/useDerivedSwapState'
import { TrainError, TrainErrorCode } from '../types'

function getLockType(tokenContract: string | null | undefined): 'erc20' | 'native' {
    if (!tokenContract || tokenContract === '0x0000000000000000000000000000000000000000') {
        return 'native'
    }
    return 'erc20'
}

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
    const { config, sdk } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const derived = useDerivedSwapState(store, hl)
    const [isRefunding, setIsRefunding] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const canRefund = derived.isTimelockExpired && derived.status === HTLCStatus.TimelockExpired

    const doRefund = useCallback(async (): Promise<string> => {
        setIsRefunding(true)
        setError(null)

        const swap = hl ? store?.getState().activeSwaps[hl] : null
        const srcNamespace = swap?.sourceNetwork?.split(':')[0] ?? null
        if (!swap?.hashlock || !srcNamespace || !swap?.srcContract || !swap?.sourceAsset) {
            const err = new TrainError('Cannot refund: missing required params', TrainErrorCode.RefundFailed)
            setError(err)
            setIsRefunding(false)
            throw err
        }

        try {
            const signer = walletCtx.getSignerForNetwork(swap.sourceNetwork)
            if (!signer) {
                throw new TrainError(`No wallet adapter for ${srcNamespace}`, TrainErrorCode.WalletNotConnected)
            }

            const adapterConfig = walletCtx.getClientConfigForNetwork(swap.sourceNetwork)
            const client = sdk.createHTLCClient(srcNamespace, { ...adapterConfig, signer } as any)
            const txHash = await client.refund({
                type: getLockType(swap.tokenContractAddress),
                chainId: swap.chainId,
                contractAddress: swap.srcContract,
                id: swap.hashlock,
                sourceAsset: swap.sourceAsset,
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
    }, [hl, walletCtx, sdk, store, config])

    return { refund: doRefund, isRefunding, canRefund, error }
}
