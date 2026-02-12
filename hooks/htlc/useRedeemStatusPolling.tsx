import { useEffect } from "react"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import { LockStatus } from "../../Models/phtlc/PHTLC"
import useSWRCommitDetails from "./useSWRCommitDetails"

interface UseRedeemStatusPollingParams {
    network: Network | undefined
    hashlock: string | undefined
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
    hashlock,
    contractAddress,
    asset,
    onStatusUpdate
}: UseRedeemStatusPollingParams) => {
    const type: 'erc20' | 'native' = asset?.contractAddress && asset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'

    // Continue polling until claimed status is 3 (successfully claimed)
    const isClaimed = false // Will be determined by checking claimed status

    const { details, isLoading, error, mutate } = useSWRCommitDetails({
        network,
        hashlock,
        contractAddress,
        type,
        enabled: !!hashlock && !!network && !!contractAddress && !isClaimed,
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

    const isClaimComplete = details?.status === LockStatus.Redeemed
    const isWaitingForClaim = !!hashlock && !isClaimComplete

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
