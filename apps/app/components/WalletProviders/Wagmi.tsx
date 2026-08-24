import { useSettingsState } from "@/context/settings";
import resolveChain from "@/lib/resolveChain";
import React, { useMemo } from "react";
import { WagmiProvider, createConfig, Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Chain, http, fallback, Transport } from 'viem';
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";
import { useRpcConfigStore } from "@/stores/rpcConfigStore";
import { getNativeToken, NetworkTypes } from "@/Models/Network";
import { coinbaseWallet, metaMask, walletConnect } from "@wagmi/connectors";
import { createHiddenWalletConnectConnector } from "@layerswap/wallet-evm";
import { isMobile } from "@layerswap/utils";
import { WALLET_CONNECT_CONFIGS } from "@/lib/wallets/layerswap/getLayerswapProviders";
import { browserInjected } from "@/lib/wallets/evm/connectors/browserInjected";

type Props = {
    children: JSX.Element | JSX.Element[]
}

const queryClient = new QueryClient()
const walletConnectConnector = walletConnect({ projectId: WALLET_CONNECT_CONFIGS.projectId, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })
const hiddenWalletConnectConnector = createHiddenWalletConnectConnector({ projectId: WALLET_CONNECT_CONFIGS.projectId })
const metaMaskConnector = metaMask({ dappMetadata: { name: WALLET_CONNECT_CONFIGS.name, url: WALLET_CONNECT_CONFIGS.url, iconUrl: WALLET_CONNECT_CONFIGS.icons[0] } })
const coinbaseWalletConnector = coinbaseWallet({ appName: WALLET_CONNECT_CONFIGS.name, appLogoUrl: WALLET_CONNECT_CONFIGS.icons[0] })
const browserInjectedConnector = browserInjected()
const defaultConnectors = [
    metaMaskConnector,
    coinbaseWalletConnector,
    walletConnectConnector,
    browserInjectedConnector,
    hiddenWalletConnectConnector,
] as const

let cachedConfig: Config | null = null

function buildTransport(chain: Chain, rpcUrls: string[]): Transport {
    if (rpcUrls.length > 1) {
        return fallback(rpcUrls.map(url => http(url)))
    }
    if (rpcUrls.length === 1) {
        return http(rpcUrls[0])
    }
    return chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
}

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();
    const { getEffectiveRpcUrl, getEffectiveRpcUrls } = useRpcConfigStore();

    const config = useMemo(() => {
        if (cachedConfig) return cachedConfig

        const chains = settings?.networks
            .filter(net =>
                net.networkType === NetworkTypes.EVM
                && !isNaN(Number(net.chainId))
                && net.nodes?.[0]?.url
                && !!getNativeToken(net)
            )
            .map(network => resolveChain(network, getEffectiveRpcUrl(network)))
            .filter((c): c is Chain => c != undefined) as Chain[]

        const transports: Record<number, Transport> = {}
        for (const chain of chains) {
            const network = settings?.networks?.find(n => Number(n.chainId) === chain.id)
            const rpcUrls = network ? getEffectiveRpcUrls(network) : []
            transports[chain.id] = buildTransport(chain, rpcUrls)
        }

        cachedConfig = createConfig({
            connectors: typeof window === 'undefined' ? [] : [...defaultConnectors],
            chains: chains as [Chain, ...Chain[]],
            transports,
            ssr: true
        })
        return cachedConfig
    }, [])

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