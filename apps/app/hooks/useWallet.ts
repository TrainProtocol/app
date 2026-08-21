import { Network } from "../Models/Network"
import { useWallet as useWalletCore, type WalletPurpose } from "@layerswap/wallet-core";
import { useSettingsState } from "../context/settings";
import { toWidgetNetwork } from "@/lib/wallets/layerswap/widgetNetwork";
import { useCallback, useMemo } from "react";

export type { WalletPurpose }

type WidgetNetwork = ReturnType<typeof toWidgetNetwork<Network>>

const WALLET_OPTIONS = {
    getNetworkId: (network: WidgetNetwork) => network.caip2Id,
}

export default function useWallet(network?: Network | undefined | null, purpose?: WalletPurpose) {
    const { networks } = useSettingsState()
    const widgetNetworks = useMemo(() => networks.map(toWidgetNetwork), [networks])
    const widgetNetwork = useMemo(() => network ? toWidgetNetwork(network) : undefined, [network])

    const { getProvider, ...rest } = useWalletCore(widgetNetworks, widgetNetwork, purpose, WALLET_OPTIONS)

    const getProviderForNetwork = useCallback((network: Network, purpose: WalletPurpose) =>
        getProvider(toWidgetNetwork(network), purpose), [getProvider])

    return { ...rest, getProvider: getProviderForNetwork }
}
