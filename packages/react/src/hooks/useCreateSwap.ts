import { useState, useCallback, useRef } from 'react'
import {
    deriveSecretFromTimelock,
    secretToHashlock,
    bytesToHex,
    formatUnits,
} from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useStoreContext } from '../providers/TrainProvider'
import { TrainError, TrainErrorCode } from '../types'
import type { StartSwapParams } from '../types'

export interface UseCreateSwapResult {
    /** Lock funds on source chain, persist swap, return hashlock */
    createSwap: (params: StartSwapParams, derivedKey: Uint8Array) => Promise<string>
    isCreating: boolean
    error: Error | null
}

/**
 * Action hook for creating a new swap (locking funds on source chain).
 *
 * Returns a hashlock on success. Pass the hashlock to `useSwapProgress`
 * to start monitoring the swap lifecycle.
 *
 * Usage:
 * ```tsx
 * const { createSwap, isCreating, error } = useCreateSwap()
 * const hashlock = await createSwap(params, derivedKey)
 * // pass hashlock to useSwapProgress or navigate to swap page
 * ```
 */
export function useCreateSwap(): UseCreateSwapResult {
    const { config, sdk } = useTrainContext()
    const walletCtx = useWalletContext()
    const store = useStoreContext()
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const createSwap = useCallback(async (params: StartSwapParams, derivedKey: Uint8Array): Promise<string> => {
        if (inFlight.current) throw new TrainError('Swap creation already in progress', TrainErrorCode.LockFailed)
        inFlight.current = true
        setIsCreating(true)
        setError(null)

        try {
            const nonce = Date.now()
            const secretBytes = deriveSecretFromTimelock(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))
            const hashlock = secretToHashlock(secret)

            // Get signer from wallet adapter
            const namespace = params.sourceNetwork.split(':')[0]
            const signer = walletCtx.getSignerForNetwork(params.sourceNetwork)
            if (!signer) {
                throw new TrainError(
                    `No wallet adapter registered for ${namespace}`,
                    TrainErrorCode.WalletNotConnected,
                )
            }

            // Create write client with signer
            const adapterConfig = walletCtx.getClientConfigForNetwork(params.sourceNetwork)
            const client = sdk.createHTLCClient(namespace, {
                ...adapterConfig,
                signer,
            } as any)

            const result = await client.userLock({
                sourceChain: params.sourceNetwork,
                destinationChain: params.destinationNetwork,
                amount: params.amount,
                destinationAmount: params.quote.receiveAmount,
                decimals: params.sourceAsset.decimals,
                destinationAsset: params.destinationAsset.contractAddress,
                sourceAsset: params.sourceAsset,
                destLpAddress: params.quote.destinationSolverAddress,
                srcLpAddress: params.quote.sourceSolverAddress,
                atomicContract: params.srcContract,
                sourceAddress: params.sourceAddress,
                destinationAddress: params.destinationAddress,
                tokenContractAddress: params.tokenContractAddress,
                chainId: params.chainId ?? params.sourceNetwork.split(':')[1],
                quoteExpiry: params.quote.quoteExpirationTimestampInSeconds,
                rewardToken: params.quote.reward?.rewardToken,
                rewardRecipient: params.quote.reward?.rewardRecipientAddress,
                rewardAmount: params.quote.reward?.amount,
                rewardTimelockDelta: params.quote.reward?.rewardTimelockTimeSpanInSeconds,
                timelockDelta: params.quote.timelock?.timelockTimeSpanInSeconds,
                hashlock,
                nonce,
                solverData: params.quote.signature,
            })

            if (store) {
                // Persist to swap history
                store.getState().addSwap(result.hashlock, {
                    requestedAmount: params.amount,
                    address: params.sourceAddress,
                    source: params.sourceNetwork,
                    destination: params.destinationNetwork,
                    source_asset: params.sourceAsset.symbol,
                    destination_asset: params.destinationAsset.symbol,
                    solver: params.solverId,
                    srcContract: params.srcContract,
                    destContract: params.destContract,
                    receiveAmount: formatUnits(BigInt(params.quote.receiveAmount), params.destinationAsset.decimals),
                    hashlock: result.hashlock,
                    txId: result.hash,
                    sourceAddress: params.sourceAddress,
                    destinationAddress: params.destinationAddress,
                    sourceSolverAddress: params.quote.sourceSolverAddress,
                    destinationSolverAddress: params.quote.destinationSolverAddress,
                })

                // Initialize swap config in-memory for monitoring
                store.getState().setSwapConfig(result.hashlock, {
                    hashlock: result.hashlock,
                    solverId: params.solverId,
                    sourceNetwork: params.sourceNetwork,
                    destinationNetwork: params.destinationNetwork,
                    srcContract: params.srcContract,
                    destContract: params.destContract,
                    tokenContractAddress: params.tokenContractAddress ?? null,
                    sourceAddress: params.sourceAddress,
                    destinationAddress: params.destinationAddress,
                    chainId: params.chainId ?? params.sourceNetwork.split(':')[1],
                    txId: result.hash,
                    quote: params.quote,
                    requestedAmount: params.amount,
                })
            }

            return result.hashlock
        } catch (err) {
            const trainError = err instanceof TrainError
                ? err
                : new TrainError(
                    err instanceof Error ? err.message : String(err),
                    TrainErrorCode.LockFailed,
                    err,
                )
            setError(trainError)
            config.onError?.(trainError)
            throw trainError
        } finally {
            inFlight.current = false
            setIsCreating(false)
        }
    }, [walletCtx, store, config, sdk])

    return { createSwap, isCreating, error }
}
