import { createContext, type Dispatch, type ReactNode, type SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { connectModalStore } from "@layerswap/wallet-core";
import * as UiKit from "@layerswap/ui-kit";
import type { ModalWalletProvider } from "@layerswap/ui-kit";
import type { WalletConnectionProvider, WalletModalConnector } from "@layerswap/wallet-core/types";
import type { Wallet } from "@layerswap/widget-types";

type ConnectDisplayMode = 'drawer' | 'dialog'

type ConnectOptions = {
    displayMode?: ConnectDisplayMode;
}

type ConnectModalContextType = {
    connect: (provider?: WalletConnectionProvider, options?: ConnectOptions) => Promise<Wallet | undefined>;
    cancel: () => void;
    selectedProvider: ModalWalletProvider | undefined;
    setSelectedProvider: (provider: ModalWalletProvider | undefined) => void;
    selectedConnector: WalletModalConnector | undefined;
    setSelectedConnector: Dispatch<SetStateAction<WalletModalConnector | undefined>>;
    selectedMultiChainConnector: WalletModalConnector | undefined;
    setSelectedMultiChainConnector: (connector: WalletModalConnector | undefined) => void;
    goBack: () => void;
    onFinish: (wallet?: Wallet) => void;
    setOpen: (open: boolean) => void;
    open: boolean;
    displayMode: ConnectDisplayMode;
};

const ConnectModalContext = createContext<ConnectModalContextType | null>(null);

export function WalletModalProvider({ children }: { children: ReactNode }) {
    return (
        <UiKit.WalletModalProvider>
            <WalletModalShell>{children}</WalletModalShell>
        </UiKit.WalletModalProvider>
    );
}

function WalletModalShell({ children }: { children: ReactNode }) {
    const { selectedProvider, setSelectedProvider, selectedConnector, setSelectedConnector,
        selectedMultiChainConnector, setSelectedMultiChainConnector, start, cancel: cancelFlow, finish, goBack, } = UiKit.useConnectModal();
    const [open, setOpen] = useState(false);
    const [displayMode, setDisplayMode] = useState<ConnectDisplayMode>("drawer");

    const connect = useCallback(async (
        provider?: WalletConnectionProvider,
        options: ConnectOptions = {},
    ) => {
        const hasConnectorPicker = !!provider?.availableConnectors?.length
            || !!provider?.additionalConnectors?.length
            || !!provider?.requestAdditionalConnectors;

        if (!hasConnectorPicker) await provider?.connectWallet();

        setDisplayMode(options.displayMode ?? "drawer");
        setOpen(true);
        return start(provider);
    }, [start]);

    const cancel = useCallback(() => {
        cancelFlow();
        setOpen(false);
    }, [cancelFlow]);

    const onFinish = useCallback((wallet?: Wallet) => {
        finish(wallet);
        setOpen(false);
    }, [finish]);

    useEffect(() => {
        if (!open && (selectedConnector || selectedMultiChainConnector)) {
            setSelectedConnector(undefined);
            setSelectedMultiChainConnector(undefined);
            setSelectedProvider(undefined);
        }
        connectModalStore._syncOpen(open);
    }, [open]);

    const value = useMemo<ConnectModalContextType>(() => ({
        connect, cancel, selectedProvider, setSelectedProvider,
        selectedConnector, setSelectedConnector, selectedMultiChainConnector, setSelectedMultiChainConnector,
        goBack, onFinish, setOpen, open, displayMode,
    }), [cancel, connect, displayMode, goBack, onFinish, open,
        selectedConnector, selectedMultiChainConnector, selectedProvider,])

    return <ConnectModalContext.Provider value={value}>{children}</ConnectModalContext.Provider>;
}

export function useConnectModal() {
    const context = useContext(ConnectModalContext);
    if (!context) throw new Error("useConnectModal must be used within a ConnectModalProvider")
    return context;
}
