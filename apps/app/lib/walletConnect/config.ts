// This is a public, client-side-only project ID for WalletConnect wallet discovery.

import AppSettings from "../AppSettings"

// It has no authentication or authorization capability and is safe to expose in bundles.
export const WALLETCONNECT_PROJECT_ID = AppSettings.WalletConnectProjectId

export const WALLETCONNECT_METADATA = {
    name: 'Train Protocol',
    description: 'Train Protocol App',
    url: 'https://train.tech/',
    icons: ['https://app.train.tech/symbol.png'],
}
