"use client"

import { createReactHookConnectionAdapter } from "@layerswap/wallet-core"
import type {
    WalletConnectionProviderProps,
    WalletProvider,
} from "@layerswap/wallet-core/types"
import { useSettingsState } from "@/context/settings"
import type { ExtendedNetwork } from "@/Models/Network"
import { walletNetworkAdapter } from "@/lib/wallets/layerswap/networkAdapter"
import useAztec from "./useAztec"

function useAztecConnection(
    _props: WalletConnectionProviderProps<ExtendedNetwork>,
) {
    return useAztec()
}

const connectionAdapter = createReactHookConnectionAdapter<ExtendedNetwork>(useAztecConnection)

/**
 * Adapts Train's Aztec SDK integration to Layerswap's external wallet-store
 * contract. Aztec remains app-owned because Layerswap does not ship an Aztec
 * wallet package.
 */
export const aztecWalletAdapter: WalletProvider<ExtendedNetwork> = {
    id: "aztec",
    createConnection: connectionAdapter.createConnection,
}

/**
 * The Aztec wallet SDK is React/context based, so its provider snapshot is
 * hydrated from inside the app tree while the registry consumes the external
 * store exposed above.
 */
export function AztecWalletAdapterHydrator() {
    const { networks } = useSettingsState()

    return (
        <connectionAdapter.Hydrator
            networks={networks}
            networkAdapter={walletNetworkAdapter}
        />
    )
}
