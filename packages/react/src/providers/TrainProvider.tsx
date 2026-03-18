import { useMemo, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import { TrainApiClient, defaultTrainSDK } from '@train-protocol/sdk'
import { defaultTrainAuth } from '@train-protocol/auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TrainContext } from './TrainContext'
import { NetworksProvider } from './NetworksProvider'
import { SecretDerivationProvider } from './SecretDerivationProvider'
import { WalletContext, type WalletContextValue } from '../wallet/WalletContext'
import type { TrainWalletAdapter, TrainSigner } from '../wallet/types'
import { createSwapStore, type SwapStore } from '../internal/store'
import type { TrainConfig } from '../types'

const StoreContext = createContext<SwapStore | null>(null)

export function useStoreContext(): SwapStore | null {
    return useContext(StoreContext)
}

export function TrainProvider({
    children,
    ...config
}: TrainConfig & { children: ReactNode }) {
    // Create API client (stable across renders)
    const apiClient = useMemo(
        () => new TrainApiClient({ baseUrl: config.baseUrl }),
        [config.baseUrl],
    )

    // Use provided SDK/Auth instances or fall back to defaults
    const sdk = config.sdk ?? defaultTrainSDK
    const auth = config.auth ?? defaultTrainAuth

    // Create swap store (stable across renders)
    const storeRef = useRef<SwapStore | null>(null)
    if (!storeRef.current) {
        storeRef.current = createSwapStore({
            persist: config.persistSwaps !== false,
            storage: config.storage,
        })
    }

    // Create or use provided QueryClient (stable across renders)
    const queryClientRef = useRef<QueryClient | null>(null)
    if (!queryClientRef.current) {
        queryClientRef.current = config.queryClient ?? new QueryClient({
            defaultOptions: {
                queries: {
                    staleTime: 30_000,
                    retry: 1,
                    refetchOnWindowFocus: false,
                },
            },
        })
    }

    // Wallet adapter registry
    const adaptersRef = useRef(new Map<string, TrainWalletAdapter>())

    const registerAdapter = useCallback((adapter: TrainWalletAdapter) => {
        adaptersRef.current.set(adapter.chainNamespace, adapter)
        return () => {
            adaptersRef.current.delete(adapter.chainNamespace)
        }
    }, [])

    const getSigner = useCallback((chainNamespace: string): TrainSigner | null => {
        const adapter = adaptersRef.current.get(chainNamespace)
        return adapter?.getSigner() ?? null
    }, [])

    const getClientConfig = useCallback((chainNamespace: string): Record<string, unknown> => {
        const adapter = adaptersRef.current.get(chainNamespace)
        return adapter?.getClientConfig?.() ?? {}
    }, [])

    const getLoginConfig = useCallback(async (chainNamespace: string): Promise<Record<string, unknown> | null> => {
        const adapter = adaptersRef.current.get(chainNamespace)
        return (await adapter?.getLoginConfig?.()) ?? null
    }, [])

    const walletValue = useMemo<WalletContextValue>(
        () => ({ adapters: adaptersRef.current, registerAdapter, getSigner, getClientConfig, getLoginConfig }),
        [registerAdapter, getSigner, getClientConfig, getLoginConfig],
    )

    const trainValue = useMemo(
        () => ({ apiClient, config, sdk, auth }),
        [apiClient, config, sdk, auth],
    )

    return (
        <QueryClientProvider client={queryClientRef.current}>
            <TrainContext.Provider value={trainValue}>
                <WalletContext.Provider value={walletValue}>
                    <StoreContext.Provider value={storeRef.current}>
                        <NetworksProvider>
                            <SecretDerivationProvider {...config.secretDerivation}>
                                {children}
                            </SecretDerivationProvider>
                        </NetworksProvider>
                    </StoreContext.Provider>
                </WalletContext.Provider>
            </TrainContext.Provider>
        </QueryClientProvider>
    )
}
