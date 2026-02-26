import useSWR from 'swr'
import TrainApiClient, { HTLCFromApi, HTLCFromApiResponse } from '../lib/trainApiClient'
import { ApiResponse } from '@/apps/app/Models/ApiResponse'

const apiClient = new TrainApiClient()

const POLL_INTERVAL_MS = 5_000

type UseOrderPollingParams = {
    solverId: string | undefined
    hashlock: string | undefined
    enabled: boolean
    onOrder: (order: HTLCFromApi) => void
}

export default function useOrderPolling({ solverId, hashlock, enabled, onOrder }: UseOrderPollingParams) {
    const key = (enabled && solverId && hashlock) ? `/orders/${solverId}/${hashlock}` : null

    const { data, error } = useSWR<ApiResponse<HTLCFromApiResponse>>(
        key,
        () => apiClient.GetOrder(solverId!, hashlock!),
        {
            refreshInterval: POLL_INTERVAL_MS,
            dedupingInterval: 2_000,
            onSuccess: (data) => data?.data && onOrder(data?.data.order)
        }
    )

    return { order: data?.data?.order, error }
}
