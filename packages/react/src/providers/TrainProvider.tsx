import { useMemo, useCallback, useRef, createContext, useContext, type ReactNode } from 'react'
import { TrainApiClient, defaultTrainSDK } from '@train-protocol/sdk'
import type { IHTLCReadClient, IHTLCClient } from '@train-protocol/sdk'
import { defaultTrainAuth } from '@train-protocol/auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TrainContext } from './TrainContext'
import { NetworksProvider } from './NetworksProvider'
import { SecretDerivationProvider } from './SecretDerivationProvider'
import { WalletContext, type WalletContextValue } from '../wallet/WalletContext'
import type { TrainWalletAdapter } from '../wallet/types'
import { createSwapStore, type SwapStore } from '../internal/store'
import type { Caip2Id, ChainNamespace } from '../internal/branded'
import { parseCaip2Id } from '../internal/branded'
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

    const findAdapter = useCallback((networkId: Caip2Id): TrainWalletAdapter => {
        const { namespace } = parseCaip2Id(networkId)
        const adapter = adaptersRef.current.get(namespace)
        if (!adapter) {
            throw new Error(
                `No wallet adapter registered for namespace "${namespace}" (network: "${networkId}"). ` +
                `Did you forget to call useRegisterWallet()?`
            )
        }
        return adapter
    }, [])

    const createClient = useCallback((networkId: Caip2Id): IHTLCReadClient => {
        return findAdapter(networkId).createClient(sdk, networkId)
    }, [findAdapter, sdk])

    const createWriteClient = useCallback((networkId: Caip2Id, address?: string): IHTLCClient => {
        return findAdapter(networkId).createWriteClient(sdk, networkId, address)
    }, [findAdapter, sdk])

    const getLoginConfig = useCallback(async (namespace: ChainNamespace, address?: string): Promise<Record<string, unknown> | null> => {
        const adapter = adaptersRef.current.get(namespace)
        return (await adapter?.getLoginConfig?.(address)) ?? null
    }, [])

    const walletValue = useMemo<WalletContextValue>(
        () => ({ registerAdapter, createClient, createWriteClient, getLoginConfig }),
        [registerAdapter, createClient, createWriteClient, getLoginConfig],
    )

    // Memoize a stable config object to prevent downstream re-renders
    const stableConfig = useMemo<TrainConfig>(
        () => ({
            baseUrl: config.baseUrl,
            onError: config.onError,
            resolveNodeUrls: config.resolveNodeUrls,
            persistSwaps: config.persistSwaps,
            storage: config.storage,
            sdk: config.sdk,
            auth: config.auth,
            queryClient: config.queryClient,
            initialNetworks: config.initialNetworks,
            initialPrices: config.initialPrices,
            secretDerivation: config.secretDerivation,
        }),
        [config.baseUrl, config.onError, config.resolveNodeUrls, config.persistSwaps, config.storage, config.sdk, config.auth, config.queryClient, config.initialNetworks, config.initialPrices, config.secretDerivation],
    )

    const trainValue = useMemo(
        () => ({ apiClient, config: stableConfig, sdk, auth }),
        [apiClient, stableConfig, sdk, auth],
    )

    return (
        <QueryClientProvider client={queryClientRef.current}>
            <TrainContext.Provider value={trainValue}>
                <WalletContext.Provider value={walletValue}>
                    <StoreContext.Provider value={storeRef.current}>
                        <NetworksProvider initialNetworks={stableConfig.initialNetworks} initialPrices={stableConfig.initialPrices}>
                            <SecretDerivationProvider {...stableConfig.secretDerivation}>
                                {children}
                            </SecretDerivationProvider>
                        </NetworksProvider>
                    </StoreContext.Provider>
                </WalletContext.Provider>
            </TrainContext.Provider>
        </QueryClientProvider>
    )
}
