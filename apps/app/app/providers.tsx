"use client"

// Must run before anything touches localStorage.
import "@/lib/storageGuard"

import React, { Suspense, useCallback } from "react"
import { IntercomProvider } from "react-use-intercom"
import { SWRConfig } from "swr"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import { FaroErrorBoundary } from "@grafana/faro-react"
import { setNetworkAdapter } from "@layerswap/utils"
import { setErrorLogger } from "@layerswap/widget-types"
import { TrainProvider } from "@train-protocol/react"
import { registerEvmSdk } from "@train-protocol/evm"
import { registerTronSdk } from "@train-protocol/tron"
import { registerStarknetSdk } from "@train-protocol/starknet"
import { registerSolanaSdk } from "@train-protocol/solana"
import { registerAztecSdk } from "@train-protocol/aztec"
import { registerFuelSdk } from "@train-protocol/fuel"
import ThemeWrapper from "@/components/themeWrapper"
import MaintananceContent from "@/components/Maintanance"
import ErrorFallback from "@/components/ErrorFallback"
import WalletsProviders from "@/components/WalletProviders"
import AuthDialog from "@/components/SecretDerivation/AuthDialog"
import SwapModalRoot from "@/components/Swap/SwapModalRoot"
import { TooltipProvider } from "@/components/shadcn/tooltip"
import { SettingsProvider } from "@/context/settings"
import { AsyncModalProvider } from "@/context/asyncModal"
import { SwapAccountsProvider } from "@/context/swapAccounts"
import QueryProvider from "@/context/query"
import { TrainAppSettings } from "@/Models/TrainAppSettings"
import { TrainSettings } from "@/Models/TrainSettings"
import { SendErrorMessage } from "@/lib/telegram"
import { IsExtensionError } from "@/helpers/errorHelper"
import { captureException, initFaro } from "@/lib/faro"
import FaroTracker from "@/components/FaroTracker"
import AppSettings from "@/lib/AppSettings"
import { useRpcConfigStore } from "@/stores/rpcConfigStore"
import Loading from "@/components/Loading"
import { walletNetworkAdapter } from "@/lib/wallets/layerswap/networkAdapter"

if (typeof window !== "undefined") {
    setNetworkAdapter(walletNetworkAdapter)
    const faro = initFaro()
    if (faro) {
        setErrorLogger(event => {
            const error = new Error(event.message || event.type)
            error.name = event.name || event.type
            if (event.stack) error.stack = event.stack
            captureException(error)
        })
    }
    registerEvmSdk()
    registerAztecSdk()
    registerSolanaSdk()
    registerStarknetSdk()
    registerTronSdk()
    registerFuelSdk()
}

const INTERCOM_APP_ID = "h5zisg78"

function logErrorToService(error: Error) {
    const extension_error = IsExtensionError(error)
    if (process.env.NEXT_PUBLIC_VERCEL_ENV && !extension_error) {
        SendErrorMessage("UI error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: ${error?.message} %0A stack: ${error?.stack} %0A`)
    }
}

type Props = {
    children: React.ReactNode
    settings: TrainSettings | null
}

export function Providers({ children, settings }: Props) {
    return (
        <>
            <SWRConfig value={{ revalidateOnFocus: false, dedupingInterval: 5000 }}>
                <ThemeProvider
                    attribute="data-theme"
                    defaultTheme="system"
                    themes={["default", "light", "mist"]}
                    storageKey="theme"
                    disableTransitionOnChange
                    enableSystem
                    value={{ light: "light", dark: "default", mist: "mist" }}
                >
                    <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500}>
                        {settings ? (
                            <AppShell settings={settings}>{children}</AppShell>
                        ) : (
                            <div className="styled-scroll flex min-h-screen w-full items-center justify-center">
                                <MaintananceContent />
                            </div>
                        )}
                    </IntercomProvider>
                </ThemeProvider>
            </SWRConfig>
            <Analytics />
        </>
    )
}

function AppShell({ children, settings }: { children: React.ReactNode; settings: TrainSettings }) {
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const resolveNodeUrls = useCallback((networkId: string) => {
        const network = settings.networks.find(n => n.caip2Id === networkId)
        return network ? getEffectiveRpcUrls(network) : []
    }, [settings.networks, getEffectiveRpcUrls])

    const pageContent = process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true'
        ? <MaintananceContent />
        : children

    return (
        <SettingsProvider data={new TrainAppSettings(settings)}>
            <TooltipProvider delayDuration={500}>
                <TrainProvider
                    baseUrl={AppSettings.TrainApiUri ?? ''}
                    resolveNodeUrls={resolveNodeUrls}
                    initialNetworks={settings.networks}
                    secretDerivation={{ persist: true }}
                >
                    <WalletsProviders>
                        <FaroTracker />
                        <ThemeWrapper>
                            <FaroErrorBoundary
                                fallback={(error, resetError) => <ErrorFallback error={error} resetErrorBoundary={resetError} />}
                                onError={logErrorToService}
                            >
                                <AsyncModalProvider>
                                    <Suspense fallback={<Loading />}>
                                        <QueryProvider>
                                            <SwapAccountsProvider>
                                                <AuthDialog />
                                                <SwapModalRoot />
                                                {pageContent}
                                            </SwapAccountsProvider>
                                        </QueryProvider>
                                    </Suspense>
                                </AsyncModalProvider>
                            </FaroErrorBoundary>
                        </ThemeWrapper>
                    </WalletsProviders>
                </TrainProvider>
            </TooltipProvider>
        </SettingsProvider>
    )
}
