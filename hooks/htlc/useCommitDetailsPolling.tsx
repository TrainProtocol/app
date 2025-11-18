import { useEffect } from "react"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import useSWRCommitDetails from "./useSWRCommitDetails"

interface UseCommitDetailsPollingParams {
    network: Network | undefined
    commitId: string | undefined
    contractAddress: string | undefined
    sourceAsset: Token | undefined
    onDetailsFound?: (details: any) => void
}

/**
 * Polls for commit details until a valid sender is found (sender != 0x0)
 * Used in UserCommitAction to wait for commit transaction to be confirmed
 */
const useCommitDetailsPolling = ({
    network,
    commitId,
    contractAddress,
    sourceAsset,
    onDetailsFound
}: UseCommitDetailsPollingParams) => {
    const type: 'erc20' | 'native' = sourceAsset?.contract ? 'erc20' : 'native'

    // Poll until we have valid commit details
    const hasValidDetails = false // Will be determined by checking sender

    const { details, isLoading, error, mutate } = useSWRCommitDetails({
        network,
        commitId,
        contractAddress,
        type,
        enabled: !!commitId && !hasValidDetails,
        refreshInterval: 3000
    })

    // Check if we found valid commit details and trigger callback
    useEffect(() => {
        if (details && details.sender && details.sender !== '0x0000000000000000000000000000000000000000') {
            if (onDetailsFound) {
                onDetailsFound(details)
            }
        }
    }, [details, onDetailsFound])

    const isWaitingForDetails = !!commitId && (!details || details.sender === '0x0000000000000000000000000000000000000000')

    return {
        details,
        isLoading,
        error,
        mutate,
        isWaitingForDetails
    }
}

export default useCommitDetailsPolling
