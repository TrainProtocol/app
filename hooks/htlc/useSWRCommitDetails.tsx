import useSWR from "swr"
import { Network } from "../../Models/Network"
import { LockDetails } from "../../Models/phtlc/PHTLC"
import { LockParams } from "../../Models/phtlc"
import useWallet from "../../hooks/useWallet"

interface UseSWRCommitDetailsParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    type: 'erc20' | 'native'
    enabled?: boolean
    refreshInterval?: number
}

const useSWRCommitDetails = ({
    network,
    hashlock,
    contractAddress,
    type,
    enabled = true,
    refreshInterval = 3000
}: UseSWRCommitDetailsParams) => {
    const { provider } = useWallet(network, 'withdrawal')

    // Create a unique key for SWR caching
    const key = (network && hashlock && contractAddress && enabled)
        ? `/htlc/details/${network.slug}/${hashlock}/${contractAddress}/${type}`
        : null

    const { data, error, mutate, isLoading } = useSWR<LockDetails | null>(
        key,
        async () => {
            if (!provider || !network || !hashlock || !contractAddress) {
                return null
            }

            const params: LockParams = {
                type,
                chainId: network.chainId,
                id: hashlock,
                contractAddress
            }

            try {
                // Try secureGetDetails first if available (verifies across multiple RPC endpoints)
                if (provider.secureGetDetails) {
                    try {
                        const details = await provider.secureGetDetails(params)
                        if (details) {
                            return details
                        }
                    } catch (secureErr) {
                        console.warn('secureGetDetails failed, falling back to getDetails:', secureErr)
                    }
                }

                // Fallback to regular getDetails
                const details = await provider.getDetails(params)
                return details
            } catch (err) {
                console.error('Error fetching commit details:', err)
                throw err
            }
        },
        {
            refreshInterval: enabled ? refreshInterval : 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 3000,
            dedupingInterval: 1000
        }
    )

    return {
        details: data,
        isLoading,
        error,
        mutate
    }
}

export default useSWRCommitDetails
