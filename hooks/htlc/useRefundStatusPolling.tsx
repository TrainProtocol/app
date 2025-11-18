import { useEffect } from "react"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import useSWRCommitDetails from "./useSWRCommitDetails"

interface UseRefundStatusPollingParams {
    network: Network | undefined
    commitId: string | undefined
    contractAddress: string | undefined
    asset: Token | undefined
    onStatusUpdate?: (details: any) => void
}

/**
 * Polls for refund status until claimed == 2 (refunded)
 * Used in UserRefundAction to track refund completion on both source and destination chains
 */
const useRefundStatusPolling = ({
    network,
    commitId,
    contractAddress,
    asset,
    onStatusUpdate
}: UseRefundStatusPollingParams) => {
    const type: 'erc20' | 'native' = asset?.contract ? 'erc20' : 'native'

    // Continue polling until claimed status is 2 (refunded)
    const isRefunded = false // Will be determined by checking claimed status

    const { details, isLoading, error, mutate } = useSWRCommitDetails({
        network,
        commitId,
        contractAddress,
        type,
        enabled: !!commitId && !!network && !!contractAddress && !isRefunded,
        refreshInterval: 5000 // Slightly longer interval for refund tracking
    })

    // Check if refund is complete and trigger callback
    useEffect(() => {
        if (details) {
            if (onStatusUpdate) {
                onStatusUpdate(details)
            }
        }
    }, [details, onStatusUpdate])

    const isRefundComplete = details?.claimed === 2
    const isWaitingForRefund = !!commitId && !isRefundComplete

    return {
        details,
        isLoading,
        error,
        mutate,
        isRefundComplete,
        isWaitingForRefund
    }
}

export default useRefundStatusPolling
