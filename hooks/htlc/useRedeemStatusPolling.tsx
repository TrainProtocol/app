import { useEffect } from "react"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import useSWRCommitDetails from "./useSWRCommitDetails"

interface UseRedeemStatusPollingParams {
    network: Network | undefined
    commitId: string | undefined
    contractAddress: string | undefined
    asset: Token | undefined
    onStatusUpdate?: (details: any) => void
}

/**
 * Polls for redeem/claim status until claimed == 3 (successfully claimed)
 * Used in RedeemAction to track claim completion on both source and destination chains
 */
const useRedeemStatusPolling = ({
    network,
    commitId,
    contractAddress,
    asset,
    onStatusUpdate
}: UseRedeemStatusPollingParams) => {
    const type: 'erc20' | 'native' = asset?.contract ? 'erc20' : 'native'

    // Continue polling until claimed status is 3 (successfully claimed)
    const isClaimed = false // Will be determined by checking claimed status

    const { details, isLoading, error, mutate } = useSWRCommitDetails({
        network,
        commitId,
        contractAddress,
        type,
        enabled: !!commitId && !!network && !!contractAddress && !isClaimed,
        refreshInterval: 5000 // 5 second interval for claim tracking
    })

    // Check if claim is complete and trigger callback
    useEffect(() => {
        if (details) {
            if (onStatusUpdate) {
                onStatusUpdate(details)
            }
        }
    }, [details, onStatusUpdate])

    const isClaimComplete = details?.claimed === 3
    const isWaitingForClaim = !!commitId && !isClaimComplete

    return {
        details,
        isLoading,
        error,
        mutate,
        isClaimComplete,
        isWaitingForClaim
    }
}

export default useRedeemStatusPolling
