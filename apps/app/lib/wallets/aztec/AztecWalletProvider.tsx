import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import type { WalletProvider as AztecSDKWalletProvider, PendingConnection } from "@aztec/wallet-sdk/manager";
import { AZTEC_APP_ID, useAztecChainInfo } from "./configs";

// Use a loose type to avoid version mismatches between @aztec/aztec.js versions.
// The wallet-sdk may bundle a different @aztec/aztec.js version than the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AztecWallet = any;

interface AztecWalletContextType {
    wallet: AztecWallet | null;
    connected: boolean;
    accountAddress: string | null;
    discoveredProviders: AztecSDKWalletProvider[];
    isDiscovering: boolean;
    pendingConnection: PendingConnection | null;
    verificationEmojis: string | null;
    connect: (providerId: string) => Promise<AztecWallet>;
    confirmConnection: () => Promise<void>;
    cancelConnection: () => void;
    disconnect: () => Promise<void>;
    startDiscovery: () => void;
}

const AztecWalletContext = createContext<AztecWalletContextType | undefined>(undefined);

const EmojiVerificationOverlay: React.FC<{
    emojis: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ emojis, onConfirm, onCancel }) => {
    // Split emojis into a 3x3 grid (9 emojis)
    const emojiChars = [...emojis];
    const rows = [
        emojiChars.slice(0, 3),
        emojiChars.slice(3, 6),
        emojiChars.slice(6, 9),
    ];

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-secondary-900 border border-secondary-500 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
                <h3 className="text-lg font-semibold text-primary-text text-center mb-2">
                    Verify Connection
                </h3>
                <p className="text-sm text-secondary-text text-center mb-5">
                    Confirm these emojis match what your wallet displays
                </p>
                <div className="flex flex-col items-center gap-1 mb-6">
                    {rows.map((row, i) => (
                        <div key={i} className="flex gap-1">
                            {row.map((emoji, j) => (
                                <div
                                    key={j}
                                    className="w-14 h-14 flex items-center justify-center bg-secondary-700 rounded-lg text-3xl"
                                >
                                    {emoji}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-3 px-2 rounded-xl font-medium text-primary-text bg-secondary-400 hover:bg-secondary-500 active:animate-press-down transition duration-200 ease-in-out focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="flex-1 py-3 px-2 rounded-xl font-medium text-primary-buttonTextColor bg-primary-500 hover:brightness-125 active:animate-press-down transition duration-200 ease-in-out focus:outline-none"
                    >
                        Emojis Match
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AztecWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<AztecWallet | null>(null);
    const [connected, setConnected] = useState(false);
    const [accountAddress, setAccountAddress] = useState<string | null>(null);
    const [discoveredProviders, setDiscoveredProviders] = useState<AztecSDKWalletProvider[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
    const [verificationEmojis, setVerificationEmojis] = useState<string | null>(null);

    const activeProviderRef = useRef<AztecSDKWalletProvider | null>(null);
    const discoveryRef = useRef<{ cancel: () => void } | null>(null);
    const pendingResolveRef = useRef<((wallet: AztecWallet) => void) | null>(null);
    const pendingRejectRef = useRef<((error: Error) => void) | null>(null);
    const isDiscoveringRef = useRef(false);
    const autoReconnectAttemptedRef = useRef(false);

    const chainInfo = useAztecChainInfo();

    const startDiscovery = useCallback(async () => {
        if (typeof window === 'undefined') return;

        discoveryRef.current?.cancel();
        isDiscoveringRef.current = false;
        setDiscoveredProviders([]);

        isDiscoveringRef.current = true;
        try {
            setIsDiscovering(true);

            const { WalletManager } = await import("@aztec/wallet-sdk/manager");

            const manager = WalletManager.configure({
                extensions: { enabled: true },
            });

            const discovery = manager.getAvailableWallets({
                chainInfo: await chainInfo(),
                appId: AZTEC_APP_ID,
                timeout: 10000,
                onWalletDiscovered: (provider) => {
                    setDiscoveredProviders(prev => {
                        if (prev.some(p => p.id === provider.id)) return prev;
                        return [...prev, provider];
                    });
                },
            });

            discoveryRef.current = discovery;

            await discovery.done;
        } catch (error) {
            console.error("Error during wallet discovery:", error);
        } finally {
            isDiscoveringRef.current = false;
            setIsDiscovering(false);
        }
    }, [chainInfo]);

    useEffect(() => {
        const wasConnected = localStorage.getItem("aztec_wallet_connected") === "true";
        const savedAddress = wasConnected ? localStorage.getItem("aztec_wallet_address") : null;
        if (savedAddress) setAccountAddress(savedAddress);
    }, []);

    // Start discovery on mount (client-side only)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        startDiscovery();

        return () => {
            discoveryRef.current?.cancel();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const connect = useCallback(async (providerId: string): Promise<AztecWallet> => {
        const provider = discoveredProviders.find(p => p.id === providerId);
        if (!provider) {
            throw new Error(`Wallet provider "${providerId}" not found`);
        }

        const { hashToEmoji } = await import("@aztec/wallet-sdk/crypto");

        let pending: PendingConnection;
        try {
            pending = await provider.establishSecureChannel(AZTEC_APP_ID);
        } catch (error) {
            startDiscovery();
            throw error;
        }

        const emojis = hashToEmoji(pending.verificationHash);
        setPendingConnection(pending);
        setVerificationEmojis(emojis);
        activeProviderRef.current = provider;

        return new Promise<AztecWallet>((resolve, reject) => {
            pendingResolveRef.current = resolve;
            pendingRejectRef.current = reject;
        });
    }, [discoveredProviders, startDiscovery]);

    const confirmConnection = useCallback(async () => {
        if (!pendingConnection) return;

        try {
            const connectedWallet = await pendingConnection.confirm();
            setWallet(connectedWallet);
            setConnected(true);

            const accounts = await connectedWallet.getAccounts();
            const address = accounts[0]?.item?.toString();
            if (address) {
                setAccountAddress(address);
            }

            // Register disconnect handler
            if (activeProviderRef.current) {
                activeProviderRef.current.onDisconnect(() => {
                    setWallet(null);
                    setConnected(false);
                    setAccountAddress(null);
                    activeProviderRef.current = null;
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem("aztec_wallet_connected");
                        localStorage.removeItem("aztec_wallet_address");
                    }
                });
            }

            if (typeof window !== 'undefined') {
                localStorage.setItem("aztec_wallet_connected", "true");
                localStorage.setItem("aztec_wallet_provider_id", activeProviderRef.current?.id ?? "");
                if (address) localStorage.setItem("aztec_wallet_address", address);
            }

            setPendingConnection(null);
            setVerificationEmojis(null);

            pendingResolveRef.current?.(connectedWallet);
            pendingResolveRef.current = null;
            pendingRejectRef.current = null;
        } catch (error) {
            console.error("Error confirming connection:", error);
            setPendingConnection(null);
            setVerificationEmojis(null);
            pendingRejectRef.current?.(error instanceof Error ? error : new Error(String(error)));
            pendingResolveRef.current = null;
            pendingRejectRef.current = null;
        }
    }, [pendingConnection]);

    const cancelConnection = useCallback(() => {
        if (pendingConnection) {
            pendingConnection.cancel();
        }
        setPendingConnection(null);
        setVerificationEmojis(null);
        pendingRejectRef.current?.(new Error("Connection cancelled by user"));
        pendingResolveRef.current = null;
        pendingRejectRef.current = null;
    }, [pendingConnection]);

    const disconnect = useCallback(async () => {
        try {
            if (activeProviderRef.current) {
                await activeProviderRef.current.disconnect();
            }
        } catch (error) {
            console.error("Error disconnecting:", error);
        } finally {
            setWallet(null);
            setConnected(false);
            setAccountAddress(null);
            activeProviderRef.current = null;
            if (typeof window !== 'undefined') {
                localStorage.removeItem("aztec_wallet_connected");
                localStorage.removeItem("aztec_wallet_provider_id");
                localStorage.removeItem("aztec_wallet_address");
            }
            startDiscovery();
        }
    }, [startDiscovery]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isDiscovering) return;
        if (connected) return;
        if (discoveredProviders.length === 0) return;
        if (autoReconnectAttemptedRef.current) return;

        const wasConnected = localStorage.getItem("aztec_wallet_connected") === "true";
        const savedProviderId = localStorage.getItem("aztec_wallet_provider_id");
        if (!wasConnected || !savedProviderId) return;

        const provider = discoveredProviders.find(p => p.id === savedProviderId);
        if (!provider) return;

        autoReconnectAttemptedRef.current = true;

        (async () => {
            try {
                const pending = await provider.establishSecureChannel(AZTEC_APP_ID);
                const connectedWallet = await pending.confirm();

                setWallet(connectedWallet);
                setConnected(true);
                activeProviderRef.current = provider;

                const accounts = await connectedWallet.getAccounts();
                const address = accounts[0]?.item?.toString();
                if (address) {
                    setAccountAddress(address);
                    localStorage.setItem("aztec_wallet_address", address);
                }

                provider.onDisconnect(() => {
                    setWallet(null);
                    setConnected(false);
                    setAccountAddress(null);
                    activeProviderRef.current = null;
                    localStorage.removeItem("aztec_wallet_connected");
                    localStorage.removeItem("aztec_wallet_address");
                });
            } catch (err) {
                console.error("Auto-reconnect failed:", err);
                setAccountAddress(null);
                localStorage.removeItem("aztec_wallet_connected");
                localStorage.removeItem("aztec_wallet_provider_id");
                localStorage.removeItem("aztec_wallet_address");
            }
        })();
    }, [isDiscovering, discoveredProviders, connected]);

    return (
        <AztecWalletContext.Provider value={{
            wallet,
            connected,
            accountAddress,
            discoveredProviders,
            isDiscovering,
            pendingConnection,
            verificationEmojis,
            connect,
            confirmConnection,
            cancelConnection,
            disconnect,
            startDiscovery,
        }}>
            {children}
            {pendingConnection && verificationEmojis && (
                <EmojiVerificationOverlay
                    emojis={verificationEmojis}
                    onConfirm={confirmConnection}
                    onCancel={cancelConnection}
                />
            )}
        </AztecWalletContext.Provider>
    );
};

export const useAztecWalletContext = () => {
    const context = useContext(AztecWalletContext);
    if (context === undefined) {
        throw new Error("useAztecWalletContext must be used within an AztecWalletProvider");
    }
    return context;
};
