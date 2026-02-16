import useSWR from "swr"
import { Network, Token } from "../../Models/Network"
import { LockDetails } from "../../Models/phtlc/PHTLC"
import { LockParams } from "../../Models/phtlc"
import { WalletProvider } from "@/Models/WalletProvider"

interface UseUserLockPollingParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    sourceAsset: Token | undefined
    enabled?: boolean
    provider: WalletProvider | undefined
    txId?: string
}

const useUserLockPolling = ({
    network,
    hashlock,
    contractAddress,
    sourceAsset,
    enabled = true,
    provider,
    txId,
}: UseUserLockPollingParams) => {
    const type: 'erc20' | 'native' = sourceAsset?.contractAddress && sourceAsset.contractAddress !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'

    const shouldPoll = !!(network && hashlock && contractAddress && enabled)

    const key = shouldPoll
        ? `/htlc/userLock/${network!.slug}/${hashlock}/${contractAddress}/${type}`
        : null

    const { data, error, isLoading, mutate } = useSWR<LockDetails | null>(
        key,
        async () => {
            if (!network || !hashlock || !contractAddress || !provider) return null
            
            const params: LockParams = {
                type,
                chainId: network.chainId,
                id: hashlock,
                contractAddress,
                txId,
            }

            try {
                return await provider?.getUserLockDetails(params)
            } catch (err) {
                console.error('Error fetching user lock details:', err)
                throw err
            }
        },
        {
            refreshInterval: shouldPoll ? 3000 : 0,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 3000,
            dedupingInterval: 1000
        }
    )

    return {
        details: data ?? undefined,
        isLoading,
        error,
        mutate,
    }
}

export default useUserLockPolling
