import { useEffect } from "react"
import useSWR from "swr"
import { Network } from "../../Models/Network"
import { Token } from "../../Models/Network"
import { LockDetails } from "../../Models/phtlc/PHTLC"
import { LockParams } from "../../Models/phtlc"
import useWallet from "../../hooks/useWallet"

interface UseSolverLockPollingParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    sourceAsset: Token | undefined
    hasSolverLock: boolean
    onDetailsFound?: (details: LockDetails) => void
}

const useSolverLockPolling = ({
    network,
    hashlock,
    contractAddress,
    sourceAsset,
    hasSolverLock,
    onDetailsFound
}: UseSolverLockPollingParams) => {
    const type: 'erc20' | 'native' = sourceAsset?.contractAddress && sourceAsset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'
    const { provider } = useWallet(network, 'withdrawal')

    const key = (network && hashlock && contractAddress && !hasSolverLock)
        ? `/htlc/solverLock/${network.slug}/${hashlock}/${contractAddress}/${type}`
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
                console.error('Error fetching solver lock details:', err)
                throw err
            }
        },
        {
            refreshInterval: !hasSolverLock ? 3000 : 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 3000,
            dedupingInterval: 1000
        }
    )

    useEffect(() => {
        if (details?.sender && onDetailsFound) {
            onDetailsFound(details)
        }
    }, [details, onDetailsFound])

    return {
        details,
        isLoading,
        error,
        mutate,
        isWaitingForSolverLock: !!hashlock && !hasSolverLock && !details?.sender
    }
}

export default useSolverLockPolling
