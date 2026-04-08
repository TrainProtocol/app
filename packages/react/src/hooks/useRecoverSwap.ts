import { useState, useCallback } from 'react'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useSwapActions } from '../internal/useSwapActions'
import { useStoreContext } from '../providers/TrainProvider'
import { useNetworksContext } from '../providers/NetworksProvider'
import { TrainError, TrainErrorCode } from '../types'
import type { SwapData } from '../types'
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
    const actions = useSwapActions()
    const { networkMap } = useNetworksContext()
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
            const srcNetwork = networkMap.get(sourceNetwork)
            if (!srcNetwork) throw new Error(`Network not found: ${networkId}`)

            const client = walletCtx.createClient(sourceNetwork)
            const details = await client.recoverSwap(txHash, srcNetwork)

            if (!details.dstChain) throw new Error('Destination network not found')

            // Resolve contract addresses from on-chain data to token symbols
            const dstNetwork = networkMap.get(details.dstChain)
            const srcToken = srcNetwork.tokens.find(t => t.contract?.toLowerCase() === details.token.toLowerCase())
            const dstToken = dstNetwork?.tokens.find(t => t.contract?.toLowerCase() === details.dstToken?.toLowerCase())

            const swapData: SwapData = {
                requestedAmount: details.amount.toString(),
                address: details.sender,
                source: networkId,
                destination: details.dstChain ?? '',
                source_asset: srcToken?.symbol ?? details.token,
                destination_asset: dstToken?.symbol ?? details.dstToken ?? '',
                srcContract: srcNetwork.trainContract,
                srcTokenContract: details.token,
                destTokenContract: details.dstToken ?? '',
                hashlock: details.hashlock,
                txId: txHash,
                sourceAddress: details.sender,
                destinationAddress: details.dstAddress ?? '',
            }
            actions.addSwap(details.hashlock, swapData)

            return details.hashlock
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
    }, [store, walletCtx, actions, config, networkMap])

    return { recover, isRecovering, error }
}
