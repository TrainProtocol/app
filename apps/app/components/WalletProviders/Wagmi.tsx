import { useSettingsState } from "../../context/settings";
import resolveChain from "../../lib/resolveChain";
import React, { useMemo } from "react";
import { WagmiProvider, createConfig, Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Chain, http, fallback, Transport } from 'viem';
import { ActiveEvmAccountProvider } from "./ActiveEvmAccount";
import { useRpcConfigStore } from "@/stores/rpcConfigStore";
import { getNativeToken, NetworkTypes } from "../../Models/Network";
import { coinbaseWallet, metaMask, walletConnect } from "@wagmi/connectors";
import { walletConnect as customWalletConnect } from "../../lib/wallets/evm/connectors/walletConnect";
import { isMobile } from "../../lib/isMobile";
import { WALLETCONNECT_PROJECT_ID } from "@/lib/walletConnect/config";
import { HIDDEN_WALLETCONNECT_ID } from "@/lib/wallets/evm/constants";
import { browserInjected } from "@/lib/wallets/evm/connectors/browserInjected";
import { trainPasskeyConnector } from "@/lib/passkeyWallet/connector";

type Props = {
    children: JSX.Element | JSX.Element[]
}

const queryClient = new QueryClient()
const walletConnectConnector = walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })
const hiddenWalletConnectConnector = customWalletConnect({
    id: HIDDEN_WALLETCONNECT_ID,
    name: 'Hidden WalletConnect',
    rdns: '',
    type: 'other',
    mobile: { native: '', universal: '' },
    icon: '',
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: false,
})
const metaMaskConnector = metaMask({
    dappMetadata: {
        name: 'Layerswap',
        url: 'https://layerswap.io/app/',
        iconUrl: 'https://layerswap.io/app/symbol.png'
    }
})
const coinbaseWalletConnector = coinbaseWallet({
    appName: 'Layerswap',
    appLogoUrl: 'https://layerswap.io/app/symbol.png',
})
const browserInjectedConnector = browserInjected()
const trainPasskey = trainPasskeyConnector()
const defaultConnectors = [
    trainPasskey,
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
            connectors: [...defaultConnectors],
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