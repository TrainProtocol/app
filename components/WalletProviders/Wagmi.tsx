import { useSettingsState } from "../../context/settings";
import { NetworkType } from "../../Models/Network";
import resolveChain from "../../lib/resolveChain";
import React from "react";
import NetworkSettings from "../../lib/NetworkSettings";
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig } from 'wagmi';
import { Chain, http } from 'viem';
import { WalletModalProvider } from '../WalletModal';
import { argent } from '../../lib/wallets/connectors/argent';
import { rainbow } from '../../lib/wallets/connectors/rainbow';
import { metaMask } from '../../lib/wallets/connectors/metamask';
import { coinbaseWallet, walletConnect } from '@wagmi/connectors'
import { hasInjectedProvider } from '../../lib/wallets/connectors/getInjectedConnector';
import { bitget } from '../../lib/wallets/connectors/bitget';
import { isMobile } from '../../lib/isMobile';
import FuelProviderWrapper from "./FuelProvider";
import { browserInjected } from "../../lib/wallets/connectors/browserInjected";
import { useSyncProviders } from "../../lib/wallets/connectors/useSyncProviders";
import { okxWallet } from "../../lib/wallets/connectors/okxWallet";

type Props = {
    children: JSX.Element | JSX.Element[]
}
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

const queryClient = new QueryClient()

function WagmiComponent({ children }: Props) {
    const providers = useSyncProviders();
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
    const isMetaMaskInjected = providers?.some(provider => provider.info.name.toLowerCase() === 'metamask');
    const isOkxInjected = providers?.some(provider => provider.info.name.toLowerCase() === 'okx wallet');
    const isRainbowInjected = hasInjectedProvider({ flag: 'isRainbow' });
    const isBitKeepInjected = hasInjectedProvider({
        namespace: 'bitkeep.ethereum',
        flag: 'isBitKeep',
    });

    const config = createConfig({
        connectors: [
            coinbaseWallet({
                appName: 'TRAIN',
                appLogoUrl: 'https://app.train.tech/symbol.png',
            }),
            walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' }),
            argent({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'argent' }),
            ...(!isMetaMaskInjected ? [metaMask({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'metamask', providers })] : []),
            ...(!isRainbowInjected ? [rainbow({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'rainbow' })] : []),
            ...(!isBitKeepInjected ? [bitget({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'bitget' })] : []),
            ...(!isOkxInjected ? [okxWallet({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: false, customStoragePrefix: 'okxWallet', providers })] : []),
            browserInjected()
        ],
        chains: settingsChains as [Chain, ...Chain[]],
        transports: transports,
    });
    return (
        <WagmiProvider config={config} >
            <QueryClientProvider client={queryClient}>
                <FuelProviderWrapper>
                    <WalletModalProvider>
                        {children}
                    </WalletModalProvider>
                </FuelProviderWrapper>
            </QueryClientProvider>
        </WagmiProvider >
    )
}

export default WagmiComponent