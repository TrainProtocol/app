import { useEffect } from "react"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import useSWRCommitDetails from "./useSWRCommitDetails"

interface UseLockDetailsPollingParams {
    network: Network | undefined
    commitId: string | undefined
    contractAddress: string | undefined
    sourceAsset: Token | undefined
    hasHashlock: boolean
    onDetailsFound?: (details: any) => void
}

/**
 * Polls for lock details until hashlock is found
 * Used in UserLockAction to wait for hashlock to appear before user can lock
 */
const useLockDetailsPolling = ({
    network,
    commitId,
    contractAddress,
    sourceAsset,
    hasHashlock,
    onDetailsFound
}: UseLockDetailsPollingParams) => {
    const type: 'erc20' | 'native' = sourceAsset?.contract ? 'erc20' : 'native'

    const { details, isLoading, error, mutate } = useSWRCommitDetails({
        network,
        commitId,
        contractAddress,
        type,
        enabled: !!commitId && !hasHashlock,
        refreshInterval: 3000
    })

    // Check if we found hashlock and trigger callback
    useEffect(() => {
        if (details?.hashlock) {
            if (onDetailsFound) {
                onDetailsFound(details)
            }
        }
    }, [details, onDetailsFound])

    const isWaitingForHashlock = !!commitId && !hasHashlock && !details?.hashlock

    return {
        details,
        isLoading,
        error,
        mutate,
        isWaitingForHashlock
    }
}

export default useLockDetailsPolling
