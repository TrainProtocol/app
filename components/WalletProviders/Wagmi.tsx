import { useSettingsState } from "../../context/settings";
import resolveChain from "../../lib/resolveChain";
import React, { useMemo } from "react";
import NetworkSettings from "../../lib/NetworkSettings";
import { WagmiProvider, createConfig, Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Chain, http, fallback } from 'viem';
import { useEvmConnectors } from "../../context/evmConnectorsContext";
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";
import { useRpcConfigStore } from "@/stores/rpcConfigStore";
import { getNativeToken } from "../../Models/Network";

type Props = {
    children: JSX.Element | JSX.Element[]
}

const queryClient = new QueryClient()

// Module level cache - config is created ONCE and never recreated to preserve connection state
let cachedConfig: Config | null = null

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();
    const { connectors } = useEvmConnectors()
    const { getEffectiveRpcUrl, getEffectiveRpcUrls, isUsingCustomRpc } = useRpcConfigStore();

    const isChain = (c: Chain | undefined): c is Chain => c != undefined

    const settingsChains = settings?.networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.caip2Id]?.ChainOrder || Number(a.chainId)) - (NetworkSettings.KnownSettings[b.caip2Id]?.ChainOrder || Number(b.chainId)))
        .filter(net => net.type?.name === "eip155"
            && !isNaN(Number(net.chainId))
            && net.nodes?.[0]?.url
            && getNativeToken(net))
        .map(network => {
            // Get the effective RPC URL (custom if configured, otherwise default)
            const effectiveRpcUrl = getEffectiveRpcUrl(network);
            return resolveChain(network, effectiveRpcUrl);
        })
        .filter(isChain) as Chain[]

    const transports = {}

    settingsChains.forEach(chain => {
        // Find the original network to get all custom RPC URLs
        const network = settings?.networks?.find(n => Number(n.chainId) === chain.id)

        if (network && isUsingCustomRpc(network.caip2Id)) {
            // Get all custom RPC URLs for fallback support
            const customUrls = getEffectiveRpcUrls(network)

            if (customUrls.length > 1) {
                // Use fallback transport with multiple URLs
                transports[chain.id] = fallback(
                    customUrls.map(url => http(url))
                )
            } else if (customUrls.length === 1) {
                // Single custom URL
                transports[chain.id] = http(customUrls[0])
            } else {
                // Fallback to default
                transports[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
            }
        } else {
            // Use default RPC URL
            transports[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
        }
    })

    // Create config ONCE - never recreate to preserve connection state
    const config = useMemo(() => {
        if (!cachedConfig) {
            cachedConfig = createConfig({
                connectors,
                chains: settingsChains as [Chain, ...Chain[]],
                transports: transports,
                ssr: true
            })
        }
        return cachedConfig
    }, []) // Empty deps - only create once

    return (
        <WagmiProvider config={config} reconnectOnMount={true}>
            <QueryClientProvider client={queryClient}>
                <ActiveEvmAccountProvider>
                    {children}
                </ActiveEvmAccountProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

export default WagmiComponent