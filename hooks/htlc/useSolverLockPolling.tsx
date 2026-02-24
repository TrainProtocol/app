import useSWR from "swr"
import { Network, Token } from "../../Models/Network"
import { LockDetails } from "../../Models/phtlc/PHTLC"
import { LockParams } from "../../Models/phtlc"
import useWallet from "../useWallet"
import { WalletProvider } from "@/Models/WalletProvider"

interface UseSolverLockPollingParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    destinationAsset: Token | undefined
    enabled?: boolean
    provider: WalletProvider | undefined
    onSuccess?: (details: LockDetails) => void
}

const useSolverLockPolling = ({
    network,
    hashlock,
    contractAddress,
    destinationAsset,
    enabled = true,
    provider,
    onSuccess,
}: UseSolverLockPollingParams) => {
    const type: 'erc20' | 'native' = destinationAsset?.contractAddress && destinationAsset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'

    const shouldPoll = !!(network && hashlock && contractAddress && enabled)

    const key = shouldPoll
        ? `/htlc/solverLock/${network!.caip2Id}/${hashlock}/${contractAddress}/${type}`
        : null

    const { data, error, isLoading, mutate } = useSWR<LockDetails | null>(
        key,
        async () => {
            if (!provider || !network || !hashlock || !contractAddress) return null
            if (!provider.getSolverLockDetails) return null

            const params: LockParams = {
                type,
                chainId: network.chainId,
                id: hashlock,
                contractAddress,
                decimals: destinationAsset?.decimals,
            }

            try {
                return await provider.getSolverLockDetails(params)
            } catch (err) {
                console.error('Error fetching solver lock details:', err)
                throw err
            }
        },
        {
            refreshInterval: shouldPoll ? 3000 : 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 3000,
            dedupingInterval: 1000,
            onSuccess: (data) => data && onSuccess?.(data),
        }
    )

    return {
        details: data ?? undefined,
        isLoading,
        error,
        mutate,
    }
}

export default useSolverLockPolling
