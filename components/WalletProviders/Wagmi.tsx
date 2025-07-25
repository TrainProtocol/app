

import { useSettingsState } from "../../context/settings";
import { NetworkType } from "../../Models/Network";
import resolveChain from "../../lib/resolveChain";
import React from "react";
import NetworkSettings from "../../lib/NetworkSettings";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { Chain, http } from 'viem';
import { argent } from '../../lib/wallets/connectors/argent';
import { rainbow } from '../../lib/wallets/connectors/rainbow';
import { metaMask } from '../../lib/wallets/connectors/metamask';
import { coinbaseWallet, walletConnect } from '@wagmi/connectors'
import { bitget } from '../../lib/wallets/connectors/bitget';
import { isMobile } from '../../lib/isMobile';
import { browserInjected } from "../../lib/wallets/connectors/browserInjected";
import { okxWallet } from "../../lib/wallets/connectors/okxWallet";

type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const queryClient = new QueryClient()

const wltcnnct_inited = walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })
const argent_inited = argent({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'argent' })
const metaMask_inited = metaMask({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'metamask' })
const rnbw_inited = rainbow({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'rainbow' })
const btgt_inited = bitget({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'bitget' })
const okx_inited = okxWallet({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'okxWallet' })

function WagmiComponent({ children }: Props) {
    const settings = useSettingsState();
    const isChain = (c: Chain | undefined): c is Chain => c != undefined
    const settingsChains = settings?.networks
        .sort((a, b) => (NetworkSettings.KnownSettings[a.name]?.ChainOrder || Number(a.chainId)) - (NetworkSettings.KnownSettings[b.name]?.ChainOrder || Number(b.chainId)))
        .filter(net => net.type == NetworkType.EVM
            && !isNaN(Number(net.chainId))
            && net.nodes.length > 0
            && net.nativeToken)
        .map(resolveChain).filter(isChain) as Chain[]

    const transports = {}

    settingsChains.forEach(chain => {
        transports[chain.id] = chain.rpcUrls.default.http[0] ? http(chain.rpcUrls.default.http[0]) : http()
    })

    const config = createConfig({
        connectors: [
            coinbaseWallet({
                appName: 'Layerswap',
                appLogoUrl: 'https://layerswap.io/app/symbol.png',
            }),
            wltcnnct_inited,
            argent_inited,
            metaMask_inited,
            rnbw_inited,
            btgt_inited,
            okx_inited,
            browserInjected()
        ],
        chains: settingsChains as [Chain, ...Chain[]],
        transports: transports,
    });

    return (
        <WagmiProvider config={config} >
            <QueryClientProvider client={queryClient}>
                    {children}
            </QueryClientProvider>
        </WagmiProvider >
    )
}

export default WagmiComponent