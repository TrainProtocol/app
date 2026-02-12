import { useEffect } from "react"
import useSWR from "swr"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import { LockDetails, LockStatus } from "../../Models/phtlc/PHTLC"
import { LockParams } from "../../Models/phtlc"
import useWallet from "../../hooks/useWallet"

interface UseSolverRedeemPollingParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    asset: Token | undefined
    onStatusUpdate?: (details: LockDetails) => void
}

const useSolverRedeemPolling = ({
    network,
    hashlock,
    contractAddress,
    asset,
    onStatusUpdate
}: UseSolverRedeemPollingParams) => {
    const type: 'erc20' | 'native' = asset?.contractAddress && asset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'
    const { provider } = useWallet(network, 'withdrawal')

    const key = (network && hashlock && contractAddress)
        ? `/htlc/solverRedeem/${network.slug}/${hashlock}/${contractAddress}/${type}`
        : null

    const { data: details, isLoading, error, mutate } = useSWR<LockDetails | null>(
        key,
        async () => {
            if (!provider || !network || !hashlock || !contractAddress) {
                return null
            }

            if (!provider.getSolverLockDetails) {
                return null
            }

            const params: LockParams = {
                type,
                chainId: network.chainId,
                id: hashlock,
                contractAddress
            }

            try {
                return await provider.getSolverLockDetails(params)
            } catch (err) {
                console.error('Error fetching solver redeem status:', err)
                throw err
            }
        },
        {
            refreshInterval: 5000,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 3000,
            dedupingInterval: 1000
        }
    )

    useEffect(() => {
        if (details && onStatusUpdate) {
            onStatusUpdate(details)
        }
    }, [details, onStatusUpdate])

    const isRedeemed = details?.status === LockStatus.Redeemed

    return {
        details,
        isLoading,
        error,
        mutate,
        isRedeemed,
        isWaitingForRedeem: !!hashlock && !isRedeemed
    }
}

export default useSolverRedeemPolling
