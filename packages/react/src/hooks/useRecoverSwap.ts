import { useState, useCallback } from 'react'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { useNetworksContext } from '../providers/NetworksProvider'
import { TrainError, TrainErrorCode } from '../types'
import type { SwapData } from '../types'
import type { RecoveredSwapConfig } from '../internal/store'
import { caip2Id } from '../internal/branded'

export interface UseRecoverSwapResult {
    /** Recover a swap from a transaction hash. Returns the hashlock. */
    recover: (txHash: string, networkId: string) => Promise<string>
    isRecovering: boolean
    error: Error | null
}

/**
 * Action hook to recover a lost swap from a transaction hash.
 *
 * First checks the local persisted store for a swap matching the given
 * sourceNetwork + txHash. If found, returns the hashlock immediately without
 * making any network calls. Otherwise, goes to chain to recover the swap data.
 *
 * Returns the recovered hashlock on success. Pass it to `useSwapProgress`
 * to start monitoring.
 *
 * @param networkId - CAIP-2 network ID (e.g. "eip155:1"), NOT a namespace
 */
export function useRecoverSwap(): UseRecoverSwapResult {
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const { networks } = useNetworksContext()
    const [isRecovering, setIsRecovering] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const recover = useCallback(async (txHash: string, networkId: string): Promise<string> => {
        setIsRecovering(true)
        setError(null)

        try {
            // Validate and brand the network ID — throws if it looks like a namespace
            const sourceNetwork = caip2Id(networkId)

            // Check local store first — avoid network call if swap already persisted
            if (store) {
                const found = store.getState().findSwapByTx(networkId, txHash)
                if (found) {
                    return found[0]
                }
            }

            // Not found locally — recover from chain
            const client = walletCtx.createClient(sourceNetwork)
            const recovered = await client.recoverSwap(txHash)

            if (store) {
                // Resolve contract addresses from on-chain data to token symbols
                const srcNetwork = networks.find(n => n.caip2Id.toUpperCase() === recovered.srcChain.toUpperCase())
                const dstNetwork = networks.find(n => n.caip2Id.toUpperCase() === recovered.dstChain.toUpperCase())
                const srcToken = srcNetwork?.tokens.find(t => t.contract?.toLowerCase() === recovered.token.toLowerCase())
                const dstToken = dstNetwork?.tokens.find(t => t.contract?.toLowerCase() === recovered.dstToken.toLowerCase())

                const swapData: SwapData = {
                    requestedAmount: recovered.amount.toString(),
                    address: recovered.sender,
                    source: recovered.srcChain,
                    destination: recovered.dstChain,
                    source_asset: srcToken?.symbol ?? recovered.token,
                    destination_asset: dstToken?.symbol ?? recovered.dstToken,
                    srcContract: recovered.srcContract,
                    hashlock: recovered.hashlock,
                    txId: txHash,
                }
                store.getState().addSwap(recovered.hashlock, swapData)

                // Initialize swap config — recovered swaps have limited data
                const swapConfig: RecoveredSwapConfig = {
                    origin: 'recovered',
                    hashlock: recovered.hashlock,
                    sourceNetwork,
                    destinationNetwork: caip2Id(recovered.dstChain),
                    srcContract: recovered.srcContract,
                    sourceAddress: recovered.sender,
                    destinationAddress: recovered.dstAddress,
                    txId: txHash,
                    requestedAmount: recovered.amount.toString(),
                }
                store.getState().setSwapConfig(recovered.hashlock, swapConfig)
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
    }, [walletCtx, store, config, networks])

    return { recover, isRecovering, error }
}
