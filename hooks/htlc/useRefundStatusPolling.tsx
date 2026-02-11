import { useEffect } from "react"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import { LockStatus } from "../../Models/phtlc/PHTLC"
import useSWRCommitDetails from "./useSWRCommitDetails"

interface UseRefundStatusPollingParams {
    network: Network | undefined
    commitId: string | undefined
    contractAddress: string | undefined
    asset: Token | undefined
    onStatusUpdate?: (details: any) => void
}

/**
 * Polls for refund status until status === LockStatus.Refunded
 * Used in UserRefundAction to track refund completion on source chain
 */
const useRefundStatusPolling = ({
    network,
    commitId,
    contractAddress,
    asset,
    onStatusUpdate
}: UseRefundStatusPollingParams) => {
    const type: 'erc20' | 'native' = asset?.contractAddress && asset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'

    const { details, isLoading, error, mutate } = useSWRCommitDetails({
        network,
        commitId,
        contractAddress,
        type,
        enabled: !!commitId && !!network && !!contractAddress,
        refreshInterval: 5000
    })

    useEffect(() => {
        if (details) {
            if (onStatusUpdate) {
                onStatusUpdate(details)
            }
        }
    }, [details, onStatusUpdate])

    const isRefundComplete = details?.status === LockStatus.Refunded
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
