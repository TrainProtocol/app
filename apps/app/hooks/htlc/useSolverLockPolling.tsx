import { useEffect, useRef } from "react"
import useSWR from "swr"
import { Network, Token } from "@/Models/Network"
import { LockDetails } from "@/Models/phtlc/PHTLC"
import { LockParams } from "@/Models/phtlc"
import { IHTLCClient } from "@train-protocol/sdk"

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
}: UseSolverLockPollingParams) => {
    const type: 'erc20' | 'native' = destinationAsset?.contractAddress && destinationAsset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'
    const consensusVerified = useRef(false)

    useEffect(() => {
        consensusVerified.current = false
    }, [hashlock])

    const shouldPoll = !!(network && hashlock && contractAddress && enabled)

    const key = shouldPoll
        ? `/htlc/solverLock/${network!.caip2Id}/${hashlock}/${contractAddress}/${type}`
        : null

    const { data, error, isLoading, mutate } = useSWR<LockDetails | null>(
        key,
        async () => {
            if (!client || !network || !hashlock || !contractAddress) return null

            const params: LockParams = {
                type,
                chainId: network.chainId,
                id: hashlock,
                contractAddress,
                decimals: destinationAsset?.decimals,
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
                    const verified = await client.getSolverLockDetailsWithConsensus(params, nodeUrls)
                    if (verified) {
                        consensusVerified.current = true
                    }
                    return verified
                }

                return result
            } catch (err) {
                console.error('Error fetching solver lock details:', err)
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
        mutate,
    }
}

export default useSolverLockPolling
