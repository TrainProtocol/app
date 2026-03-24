import { useState, useCallback } from 'react'
import type { RecoveredSwapData } from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { TrainError, TrainErrorCode } from '../types'
import type { SwapData } from '../types'

export interface UseRecoverSwapResult {
    /** Recover a swap from a transaction hash. Returns the hashlock. */
    recover: (txHash: string, chainNamespace: string, rpcUrl: string) => Promise<string>
    isRecovering: boolean
    error: Error | null
}

/**
 * Action hook to recover a lost swap from a transaction hash.
 *
 * Returns the recovered hashlock on success. Pass it to `useSwapProgress`
 * to start monitoring.
 */
export function useRecoverSwap(): UseRecoverSwapResult {
    const { config, sdk } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const [isRecovering, setIsRecovering] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const recover = useCallback(async (txHash: string, chainNamespace: string, rpcUrl: string): Promise<string> => {
        setIsRecovering(true)
        setError(null)

        try {
            const adapterConfig = walletCtx.getClientConfig(chainNamespace)
            const client = sdk.createHTLCClient(chainNamespace, { ...adapterConfig, rpcUrl } as any)
            const recovered = await client.recoverSwap(txHash)

            if (store) {
                const swapData: SwapData = {
                    requestedAmount: recovered.amount.toString(),
                    address: recovered.sender,
                    source: recovered.srcChain,
                    destination: recovered.dstChain,
                    source_asset: recovered.token,
                    destination_asset: recovered.dstToken,
                    srcContract: recovered.srcContract,
                    hashlock: recovered.hashlock,
                    txId: txHash,
                }
                store.getState().addSwap(recovered.hashlock, swapData)

                // Initialize active swap for immediate monitoring
                store.getState().initActiveSwap(recovered.hashlock, {
                    hashlock: recovered.hashlock,
                    nonce: null,
                    secret: null,
                    solverId: null,
                    sourceNetwork: recovered.srcChain,
                    destinationNetwork: recovered.dstChain,
                    srcContract: recovered.srcContract,
                    destContract: null,
                    tokenContractAddress: null,
                    sourceAddress: recovered.sender,
                    destinationAddress: recovered.dstAddress,
                    chainId: null,
                    txId: txHash,
                    sourceAsset: null,
                    destinationAsset: null,
                    quote: null,
                    requestedAmount: recovered.amount.toString(),
                })
            }

            return recovered.hashlock
        } catch (err) {
            const trainError = new TrainError(
                err instanceof Error ? err.message : String(err),
                TrainErrorCode.RecoverFailed,
                err,
            )
            setError(trainError)
            config.onError?.(trainError)
            throw trainError
        } finally {
            setIsRecovering(false)
        }
    }, [sdk, walletCtx, store, config])

    return { recover, isRecovering, error }
}
