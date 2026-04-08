import { useState, useCallback, useRef } from 'react'
import {
    deriveSecretFromCryptoKey,
    secretToHashlock,
    bytesToHex,
    formatUnits,
} from '@train-protocol/sdk'
import { useTrainContext } from '../providers/TrainContext'
import { useWalletContext } from '../wallet/WalletContext'
import { useSwapActions } from '../internal/useSwapActions'
import { useSDStoreContext } from '../providers/SecretDerivationProvider'
import { TrainError, TrainErrorCode } from '../types'
import type { StartSwapParams } from '../types'
import { caip2Id, parseCaip2Id } from '../internal/branded'

export interface UseCreateSwapResult {
    /** Lock funds on source chain, persist swap, return hashlock */
    createSwap: (params: StartSwapParams) => Promise<string>
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
 * const hashlock = await createSwap(params)
 * // pass hashlock to useSwapProgress or navigate to swap page
 * ```
 */
export function useCreateSwap(): UseCreateSwapResult {
    const { config } = useTrainContext()
    const walletCtx = useWalletContext()
    const actions = useSwapActions()
    const sdStore = useSDStoreContext()
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const inFlight = useRef(false)

    const createSwap = useCallback(async (params: StartSwapParams): Promise<string> => {
        if (inFlight.current) throw new TrainError('Swap creation already in progress', TrainErrorCode.LockFailed)
        inFlight.current = true
        setIsCreating(true)
        setError(null)

        try {
            const derivedKey = sdStore?.getState().derivedKey
            if (!derivedKey) {
                throw new TrainError('Cannot create swap: not logged in (derivedKey unavailable)', TrainErrorCode.LockFailed)
            }

            const nonce = Date.now()
            const secretBytes = await deriveSecretFromCryptoKey(derivedKey, nonce)
            const secret = bytesToHex(Array.from(secretBytes))
            const hashlock = secretToHashlock(secret)


            const sourceNetwork = caip2Id(params.sourceNetwork)
            const { reference: sourceChainRef } = parseCaip2Id(sourceNetwork)

            // Create write client via wallet adapter — pass source address so the
            // bridge resolves the correct connector / signer for this account.
            const client = walletCtx.createWriteClient(sourceNetwork, params.sourceAddress)

            const result = await client.userLock({
                sourceChain: params.sourceNetwork,
                destinationChain: params.destinationNetwork,
                amount: params.amount,
                destinationAmount: params.quote.receiveAmount,
                sourceAsset: params.sourceAsset,
                destinationAsset: params.destinationAsset,
                destSolverAddress: params.quote.destinationSolverAddress,
                srcSolverAddress: params.quote.sourceSolverAddress,
                atomicContract: params.srcContract,
                sourceAddress: params.sourceAddress,
                destinationAddress: params.destinationAddress,
                chainId: params.chainId ?? sourceChainRef,
                quoteExpiry: params.quote.quoteExpirationTimestampInSeconds,
                rewardToken: params.quote.reward?.rewardToken,
                rewardRecipient: params.quote.reward?.rewardRecipientAddress,
                rewardAmount: params.quote.reward?.amount,
                rewardTimelockDelta: params.quote.reward?.rewardTimelockTimeSpanInSeconds,
                timelockDelta: params.quote.timelockTimeSpanInSeconds,
                hashlock,
                nonce,
                solverData: params.quote.signature,
            })

            // Persist swap data (also initializes default flags)
            actions.addSwap(result.hashlock, {
                requestedAmount: params.amount,
                address: params.sourceAddress,
                source: params.sourceNetwork,
                destination: params.destinationNetwork,
                source_asset: params.sourceAsset.symbol,
                destination_asset: params.destinationAsset.symbol,
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
    }, [walletCtx, actions, sdStore, config])

    return { createSwap, isCreating, error }
}
