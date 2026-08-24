"use client"
import { useCallback, useMemo, type ReactNode } from "react";
import { WalletListAdaptersProvider, type WalletListAdapters } from "@layerswap/ui-kit";
import { truncateDecimals } from "@layerswap/utils";
import { useSettingsState } from "@/context/settings";
import { useConnectModal } from "@/components/WalletModal";
import { useBalance } from "@/lib/balances/useBalance";
import { toWidgetNetwork } from "@/lib/wallets/layerswap/widgetNetwork";

export const TrainWalletListAdapters = ({ children }: { children: ReactNode }) => {
    const { networks } = useSettingsState()
    const { connect } = useConnectModal()

    const connectAdapter = useCallback<WalletListAdapters["connect"]>(
        (provider, context) => connect(provider, context?.layout === "overlay" ? { displayMode: "dialog" } : undefined),
        [connect]
    )

    const useWalletBalance = useCallback<WalletListAdapters["useWalletBalance"]>(({ address, network, token }) => {
        const caip2Id = (network as { caip2Id?: string } | undefined)?.caip2Id
        const balanceNetwork = token ? networks.find(n => n.caip2Id === caip2Id && n.tokens.some(t => t.symbol === token.symbol)) : undefined
        const { balances, isLoading } = useBalance(address, balanceNetwork)
        const balance = balances?.find(b => b?.token === token?.symbol)

        return {
            formatted: balance?.amount !== undefined ? truncateDecimals(balance.amount, Math.min(token?.decimals ?? 8, 8)) : undefined,
            isLoading,
        }
    }, [networks])

    const adapters = useMemo<Partial<WalletListAdapters>>(() => ({
        networks: networks.map(toWidgetNetwork),
        connect: connectAdapter,
        getNetworkId: network => (network as { caip2Id?: string }).caip2Id ?? network.name,
        useWalletBalance,
    }), [networks, connectAdapter, useWalletBalance])

    return <WalletListAdaptersProvider adapters={adapters}>{children}</WalletListAdaptersProvider>
}
