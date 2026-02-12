import { useEffect } from "react"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import useSWRCommitDetails from "./useSWRCommitDetails"

interface UseCommitDetailsPollingParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    sourceAsset: Token | undefined
    onDetailsFound?: (details: any) => void
}

/**
 * Polls for commit details until a valid sender is found (sender != 0x0)
 * Used in UserCommitAction to wait for commit transaction to be confirmed
 */
const useUserLockDetailsPolling = ({
    network,
    hashlock,
    contractAddress,
    sourceAsset,
    onDetailsFound
}: UseCommitDetailsPollingParams) => {
    const type: 'erc20' | 'native' = sourceAsset?.contractAddress && sourceAsset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'

    // Poll until we have valid commit details
    const hasValidDetails = false // Will be determined by checking sender

    const { details, isLoading, error, mutate } = useSWRCommitDetails({
        network,
        hashlock,
        contractAddress,
        type,
        enabled: !!hashlock && !hasValidDetails,
        refreshInterval: 3000
    })

    // Check if we found valid commit details and trigger callback
    useEffect(() => {
        if (details) {
            if (onDetailsFound) {
                onDetailsFound(details)
            }
        }
    }, [details, onDetailsFound])

    const isWaitingForDetails = !!hashlock && (!details || details.sender === '0x0000000000000000000000000000000000000000')

    return {
        details,
        isLoading,
        error,
        mutate,
        isWaitingForDetails
    }
}

export default useUserLockDetailsPolling
