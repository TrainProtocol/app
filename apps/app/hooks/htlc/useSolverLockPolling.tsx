import { useEffect, useRef, useCallback, useState } from "react"
import useSWR from "swr"
import { Network, Token } from "@/Models/Network"
import { LockDetails } from "@/Models/phtlc/PHTLC"
import { GetLockParams } from "@/Models/phtlc"
import { IHTLCClient } from "@train-protocol/sdk"

const CONSENSUS_ERROR_PREFIX = 'Lock details do not match'

function isConsensusMismatchError(err: unknown): boolean {
    return err instanceof Error && err.message.startsWith(CONSENSUS_ERROR_PREFIX)
}

interface UseSolverLockPollingParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    destinationAsset: Token | undefined
    enabled?: boolean
    client: IHTLCClient | undefined
    nodeUrls: string[]
    solverAddress?: string
    onSuccess?: (details: LockDetails) => void
    onConsensusFailed?: () => void
}

const useSolverLockPolling = ({
    network,
    hashlock,
    contractAddress,
    destinationAsset,
    enabled = true,
    client,
    nodeUrls,
    solverAddress,
    onSuccess,
    onConsensusFailed,
}: UseSolverLockPollingParams) => {
    const type: 'erc20' | 'native' = destinationAsset?.contractAddress && destinationAsset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'
    const consensusVerified = useRef(false)
    const consensusFailed = useRef(false)
    const [consensusVerifying, setConsensusVerifying] = useState(false)
    const nodeUrlsKey = nodeUrls.join(',')

    useEffect(() => {
        consensusVerified.current = false
        consensusFailed.current = false
        setConsensusVerifying(false)
    }, [hashlock, nodeUrlsKey])

    const shouldPoll = !!(network && hashlock && contractAddress && enabled && !consensusFailed.current)

    const key = shouldPoll
        ? `/htlc/solverLock/${network!.caip2Id}/${hashlock}/${contractAddress}/${type}`
        : null

    const handleConsensusFailed = useCallback(() => {
        consensusFailed.current = true
        onConsensusFailed?.()
    }, [onConsensusFailed])

    const { data, error, isLoading, mutate } = useSWR<LockDetails | null>(
        key,
        async () => {
            if (!client || !network || !hashlock || !contractAddress || !destinationAsset) return null

            const params: GetLockParams = {
                type,
                chainId: network.chainId,
                id: hashlock,
                trainContractAddress: contractAddress,
                tokenDecimals: destinationAsset?.decimals,
                solverAddress,
            }

            const primaryUrl = nodeUrls[0]
            if (!primaryUrl) return null

            try {
                // Regular polling: single node only
                const result = await client.getSolverLockDetails(params, primaryUrl)

                if (!result) return null

                // First detection: verify with multi-node consensus
                if (!consensusVerified.current && nodeUrls.length > 1) {
                    setConsensusVerifying(true)
                    try {
                        const verified = await client.getSolverLockDetailsWithConsensus(params, nodeUrls, { prefetchedResult: result })
                        if (verified) {
                            consensusVerified.current = true
                            setConsensusVerifying(false)
                        }
                        // If quorum not met (null): keep verifying, will retry next poll
                    } catch (err) {
                        if (isConsensusMismatchError(err)) {
                            setConsensusVerifying(false)
                            handleConsensusFailed()
                            return null
                        }
                        console.error('Consensus verification error:', err)
                        // Keep verifying state for transient errors, will retry next poll
                    }
                    // Always return single-node result so lock doesn't disappear
                    return result
                }

                return result
            } catch (err) {
                console.error('Error fetching solver lock details:', err)
                if (isConsensusMismatchError(err)) {
                    handleConsensusFailed()
                    return null
                }
                throw err
            }
        },
        {
            refreshInterval: shouldPoll ? 3000 : 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 3000,
            dedupingInterval: 1000,
            onSuccess: (data) => data && onSuccess?.(data),
        }
    )

    return {
        details: data ?? undefined,
        isLoading,
        error,
        consensusFailed: consensusFailed.current,
        consensusVerifying,
        consensusVerified: consensusVerified.current,
        mutate,
    }
}

export default useSolverLockPolling
