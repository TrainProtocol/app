import { createContext, useContext } from 'react'
import type { TrainApiClient, TrainSDK } from '@train-protocol/sdk'
import type { TrainAuth } from '@train-protocol/auth'
import type { TrainConfig } from '../types'

export interface TrainContextValue {
    apiClient: TrainApiClient
    config: TrainConfig
    sdk: TrainSDK
    auth: TrainAuth
}

export const TrainContext = createContext<TrainContextValue | null>(null)

export function useTrainContext(): TrainContextValue {
    const ctx = useContext(TrainContext)
    if (!ctx) {
        throw new Error('useTrainContext must be used within a <TrainProvider>')
    }
    return ctx
}
