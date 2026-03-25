import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { CreateConnectorFn } from 'wagmi';
import { coinbaseWallet, walletConnect, metaMask } from '@wagmi/connectors'
import { walletConnect as customWalletConnect } from '../lib/wallets/evm/connectors/resolveConnectors/walletConnect';
import { browserInjected } from '../lib/wallets/evm/connectors/browserInjected';
import { isMobile } from '../lib/isMobile';
import { WalletConnectWallet } from '@/Models/WalletConnectWallet';
import AppSettings from '@/lib/AppSettings';

type ContextType = {
    connectors: CreateConnectorFn[],
    walletConnectConnectors: WalletConnectWallet[],
    addWalletConnectWallet: (connector: WalletConnectWallet) => void,
    hiddenWalletConnectConnector: CreateConnectorFn,
    walletConnectWalletsLoaded: boolean,
    loadWalletConnectWallets: () => Promise<WalletConnectWallet[]>
}

const EvmConnectorsContext = createContext<ContextType | null>(null);

export const featuredWalletsIds = [
    'metamask',
    'argent',
    'rainbow',
    'bitkeep',
    'okx-wallet',
]

const WALLETCONNECT_PROJECT_ID = AppSettings.WalletConnectProjectId;
const wltcnnct_inited = walletConnect({ projectId: WALLETCONNECT_PROJECT_ID, showQrModal: isMobile(), customStoragePrefix: 'walletConnect' })

// Hidden WalletConnect connector for dynamic wallets - not shown in the list
// Uses custom walletConnect with unique ID so we can identify it
export const HIDDEN_WALLETCONNECT_ID = 'hiddenWalletConnect'
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

let cachedWalletConnectWallets: WalletConnectWallet[] | null = null

const loadWalletConnectWalletRegistry = async (): Promise<WalletConnectWallet[]> => {
    if (cachedWalletConnectWallets) {
        return cachedWalletConnectWallets
    }

    const module = await import('../lib/wallets/evm/connectors/resolveConnectors')
    cachedWalletConnectWallets = module.walletConnectWallets
    return cachedWalletConnectWallets
}

// Create stable connector instances at module level to ensure wagmi can reconnect properly
const metaMaskConnector = metaMask({
    dappMetadata: {
        name: 'Train',
        url: 'https://app.train.tech/',
        iconUrl: 'https://app.train.tech/symbol.png'
    }
})

const coinbaseWalletConnector = coinbaseWallet({
    appName: 'Train',
    appLogoUrl: 'https://app.train.tech/symbol.png',
})

const browserInjectedConnector = browserInjected()

export function EvmConnectorsProvider({ children }) {
    const [walletConnectConnectors, setWalletConnectConnectors] = useState<WalletConnectWallet[]>([])
    const [walletConnectWalletsLoaded, setWalletConnectWalletsLoaded] = useState(false)

    const addWalletConnectWallet = useCallback((connector: WalletConnectWallet): void => {
        setWalletConnectConnectors((prev) => {
            if (prev.length === 0) {
                return [connector]
            }

            return [
                connector,
                ...prev.filter(v => v.name.toLowerCase() !== connector.name.toLowerCase())
            ]
        })
    }, [])

    const loadWalletConnectWallets = useCallback(async (): Promise<WalletConnectWallet[]> => {
        const loadedWallets = await loadWalletConnectWalletRegistry()

        setWalletConnectConnectors((prev) => {
            const existingIds = new Set(prev.map(wallet => wallet.id.toLowerCase()))
            const nonExistingWallets = loadedWallets.filter(wallet => !existingIds.has(wallet.id.toLowerCase()))

            if (nonExistingWallets.length === 0) {
                return prev.length > 0 ? prev : loadedWallets
            }

            return [...prev, ...nonExistingWallets]
        })
        setWalletConnectWalletsLoaded(true)

        return loadedWallets
    }, [])

    const defaultConnectors: CreateConnectorFn[] = useMemo(() => [
        metaMaskConnector,
        coinbaseWalletConnector,
        wltcnnct_inited,
        browserInjectedConnector,
        hiddenWalletConnectConnector // Hidden connector for dynamic wallets
    ], [])

    return (
        <EvmConnectorsContext.Provider value={{
            connectors: defaultConnectors,
            walletConnectConnectors,
            addWalletConnectWallet,
            hiddenWalletConnectConnector,
            walletConnectWalletsLoaded,
            loadWalletConnectWallets
        }}>
            {children}
        </EvmConnectorsContext.Provider>
    )
}

export function useEvmConnectors() {
    const data = useContext(EvmConnectorsContext);

    if (data === null) {
        throw new Error('useEvmConnectors must be used within a EvmConnectorsProvider');
    }

    return data;
}
