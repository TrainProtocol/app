import { useRef } from "react"
import useSWR from "swr"
import { Network, Token } from "../../Models/Network"
import { LockDetails } from "../../Models/phtlc/PHTLC"
import { LockParams } from "../../Models/phtlc"
import { IHTLCClient, LockStatus, TransactionStatus } from "@train-protocol/sdk"

export const USER_LOCK_TX_FAILED_ERROR = 'Your lock transaction has failed on-chain. No funds were locked — you can safely retry the swap.'

interface UseUserLockPollingParams {
    network: Network | undefined
    hashlock: string | undefined
    contractAddress: string | undefined
    sourceAsset: Token | undefined
    enabled?: boolean
    client: IHTLCClient | undefined
    txId?: string
    onSuccess?: (details: LockDetails) => void
    onTransactionFailed?: () => void
}

const useUserLockPolling = ({
    network,
    hashlock,
    contractAddress,
    sourceAsset,
    enabled = true,
    client,
    txId,
    onSuccess,
    onTransactionFailed,
}: UseUserLockPollingParams) => {
    const type: 'erc20' | 'native' = sourceAsset?.contract && sourceAsset.contract !== '0x0000000000000000000000000000000000000000' ? 'erc20' : 'native'
    const txFailedRef = useRef(false)

    const shouldPoll = !!(network && hashlock && contractAddress && enabled && client)

    const key = shouldPoll
        ? `/htlc/userLock/${network!.caip2Id}/${hashlock}/${contractAddress}/${type}`
        : null

    const { data, error, isLoading, mutate } = useSWR<LockDetails | null>(
        key,
        async () => {
            if (!network || !hashlock || !contractAddress || !client) return null

            const params: LockParams = {
                type,
                chainId: network.chainId,
                id: hashlock,
                contractAddress,
                txId,
                decimals: sourceAsset?.decimals,
            }

            try {
                return await client.getUserLockDetails(params)
            } catch (err) {
                console.error('Error fetching user lock details:', err)
                throw err
            }
        },
        {
            refreshInterval: (data) => {
                if (data?.status === LockStatus.Redeemed || txFailedRef.current) return 0
                return shouldPoll ? 3000 : 0
            },
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: true,
            errorRetryInterval: 3000,
            dedupingInterval: 1000,
            onSuccess: (data) => data && onSuccess?.(data),
        }
    )

    const lockFound = !!data
    const shouldPollTx = shouldPoll && !!txId && !lockFound && !txFailedRef.current

    const txKey = shouldPollTx
        ? `/htlc/tx/${network!.caip2Id}/${txId}`
        : null

    const { data: txInfo } = useSWR(
        txKey,
        async () => {
            if (!client || !txId) return null

            try {
                return await client.getTransaction(txId)
            } catch (err) {
                console.error('Error fetching transaction status:', err)
                return null
            }
        },
        {
            refreshInterval: () => shouldPollTx ? 3000 : 0,
            revalidateOnFocus: false,
            shouldRetryOnError: false,
            dedupingInterval: 1000,
            onSuccess: (data) => {
                if (data?.status === TransactionStatus.Failed && !txFailedRef.current) {
                    txFailedRef.current = true
                    onTransactionFailed?.()
                }
            },
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
