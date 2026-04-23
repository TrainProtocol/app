// This is a public, client-side-only project ID for WalletConnect wallet discovery.

import AppSettings from "../AppSettings"

// It has no authentication or authorization capability and is safe to expose in bundles.
export const WALLETCONNECT_PROJECT_ID = AppSettings.WalletConnectProjectId

export const WALLETCONNECT_METADATA = {
    name: 'Layerswap',
    description: 'Layerswap App',
    url: 'https://layerswap.io/app/',
    icons: ['https://www.layerswap.io/app/symbol.png'],
}
