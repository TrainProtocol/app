"use client"

import React, { useCallback, useEffect, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { IntercomProvider } from "react-use-intercom"
import { SWRConfig } from "swr"
import { PostHogProvider } from "posthog-js/react"
import posthog from "posthog-js"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "next-themes"
import { ErrorBoundary } from "react-error-boundary"
import { registerEvmSdk } from "@train-protocol/evm"
import { TrainProvider } from "@train-protocol/react"
import ProgressBar from "@badrap/bar-of-progress"

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
import { QueryParams } from "@/Models/QueryParams"
import { SendErrorMessage } from "@/lib/telegram"
import { IsExtensionError } from "@/helpers/errorHelper"
import AppSettings from "@/lib/AppSettings"
import { useRpcConfigStore } from "@/stores/rpcConfigStore"

if (typeof window !== "undefined") {
    registerEvmSdk()
    import("@train-protocol/aztec").then(m => m.registerAztecSdk())
    import("@train-protocol/solana").then(m => m.registerSolanaSdk())
    import("@train-protocol/starknet").then(m => m.registerStarknetSdk())
    import("@train-protocol/tron").then(m => m.registerTronSdk())
}

const INTERCOM_APP_ID = "h5zisg78"
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"

const progress = typeof window !== "undefined"
    ? new ProgressBar({ size: 2, color: "rgb(var(--ls-colors-primary))", className: "bar-of-progress", delay: 100 })
    : null

if (typeof window !== "undefined" && posthogKey) {
    posthog.init(posthogKey, {
        api_host: posthogHost,
        person_profiles: "identified_only",
        loaded: (ph) => {
            if (process.env.NODE_ENV === "development") ph.debug()
        },
    })
}

function logErrorToService(error: Error, info: { componentStack?: string | null }) {
    const extension_error = IsExtensionError(error)
    if (process.env.NEXT_PUBLIC_VERCEL_ENV && !extension_error) {
        SendErrorMessage("UI error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: ${error?.message} %0A errorInfo: ${info?.componentStack} %0A stack: ${error?.stack ?? error.stack} %0A`)
    }
}

type Props = {
    children: React.ReactNode
    settings: TrainSettings | null
}

export function Providers({ children, settings }: Props) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { getEffectiveRpcUrls } = useRpcConfigStore()

    useEffect(() => {
        progress?.finish()
        posthog?.capture("$pageview")
    }, [pathname])

    useEffect(() => {
        if (!progress) return
        const onClick = (e: MouseEvent) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const a = (e.target as HTMLElement | null)?.closest?.('a')
            if (!a || (a.target && a.target !== '_self')) return
            const href = a.getAttribute('href')
            if (!href || href.startsWith('#') || href.startsWith('http')) return
            progress.start()
        }
        const onPopState = () => progress.start()
        document.addEventListener('click', onClick)
        window.addEventListener('popstate', onPopState)
        return () => {
            document.removeEventListener('click', onClick)
            window.removeEventListener('popstate', onPopState)
        }
    }, [])

    const resolveNodeUrls = useCallback((networkId: string) => {
        const network = settings?.networks.find(n => n.caip2Id === networkId)
        return network ? getEffectiveRpcUrls(network) : []
    }, [settings, getEffectiveRpcUrls])

    const query = useMemo<QueryParams>(() => {
        const isTrue = (k: string) => searchParams?.get(k) === 'true'
        return {
            ...Object.fromEntries(searchParams?.entries() ?? []),
            lockNetwork: isTrue('lockNetwork'),
            hideAddress: isTrue('hideAddress'),
            hideFrom: isTrue('hideFrom'),
            hideTo: isTrue('hideTo'),
            lockFrom: isTrue('lockFrom'),
            lockTo: isTrue('lockTo'),
            lockAsset: isTrue('lockAsset'),
            lockFromAsset: isTrue('lockFromAsset'),
            lockToAsset: isTrue('lockToAsset'),
            hideLogo: isTrue('hideLogo'),
        }
    }, [searchParams])

    return (
        <PostHogProvider client={posthog}>
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
                            <QueryProvider query={query}>
                                <SettingsProvider data={new TrainAppSettings(settings)}>
                                    <TooltipProvider delayDuration={500}>
                                        <TrainProvider
                                            baseUrl={AppSettings.TrainApiUri ?? ''}
                                            resolveNodeUrls={resolveNodeUrls}
                                            initialNetworks={settings.networks}
                                            secretDerivation={{ persist: true }}
                                        >
                                            <WalletsProviders appName={searchParams?.get('appName') ?? undefined}>
                                                <ThemeWrapper>
                                                    <ErrorBoundary FallbackComponent={ErrorFallback} onError={logErrorToService}>
                                                        <SwapAccountsProvider>
                                                            <AsyncModalProvider>
                                                                <AuthDialog />
                                                                <SwapModalRoot />
                                                                {process.env.NEXT_PUBLIC_IN_MAINTANANCE === 'true'
                                                                    ? <MaintananceContent />
                                                                    : children}
                                                            </AsyncModalProvider>
                                                        </SwapAccountsProvider>
                                                    </ErrorBoundary>
                                                </ThemeWrapper>
                                            </WalletsProviders>
                                        </TrainProvider>
                                    </TooltipProvider>
                                </SettingsProvider>
                            </QueryProvider>
                        ) : (
                            <div className="styled-scroll flex min-h-screen w-full items-center justify-center">
                                <MaintananceContent />
                            </div>
                        )}
                    </IntercomProvider>
                </ThemeProvider>
            </SWRConfig>
            <Analytics />
        </PostHogProvider>
    )
}
