import { useState, useCallback } from 'react'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useSwapActions } from '../internal/useSwapActions'
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
 * Returns the recovered hashlock on success. Pass it to `useSwapProgress`
 * to start monitoring.
 *
 * @param networkId - CAIP-2 network ID (e.g. "eip155:1"), NOT a namespace
 */
export function useRecoverSwap(): UseRecoverSwapResult {
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const actions = useSwapActions()
    const { networks } = useNetworksContext()
    const [isRecovering, setIsRecovering] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    const recover = useCallback(async (txHash: string, networkId: string): Promise<string> => {
        setIsRecovering(true)
        setError(null)

        try {
            // Validate and brand the network ID — throws if it looks like a namespace
            const sourceNetwork = caip2Id(networkId)

            // Create read-only client via wallet adapter (no signer needed for recovery)
            const client = walletCtx.createClient(sourceNetwork)
            const recovered = await client.recoverSwap(txHash)

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
                srcTokenContract: recovered.token,
                destTokenContract: recovered.dstToken,
                hashlock: recovered.hashlock,
                txId: txHash,
                sourceAddress: recovered.sender,
                destinationAddress: recovered.dstAddress,
            }
            actions.addSwap(recovered.hashlock, swapData)

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
    }, [walletCtx, actions, config, networks])

    return { recover, isRecovering, error }
}
