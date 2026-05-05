import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import type { Wallet as AztecWallet } from "@aztec/aztec.js/wallet";
import type { WalletProvider as AztecSDKWalletProvider, PendingConnection } from "@aztec/wallet-sdk/manager";
import { AZTEC_APP_ID, useAztecCapabilityManifest, useAztecChainInfo } from "@/lib/wallets/aztec/configs";
import { useAztecWalletStore } from "@/stores/aztecWalletStore";
import { ActiveAztecAccountProvider } from "./ActiveAztecAccount";
import SubmitButton from "../buttons/submitButton";

interface AztecWalletContextType {
    connect: (providerId: string) => Promise<AztecWallet>;
    disconnect: () => Promise<void>;
}

const AztecWalletContext = createContext<AztecWalletContextType | undefined>(undefined);

export const AztecWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { setWallet } = useAztecWalletStore();
    const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
    const [verificationEmojis, setVerificationEmojis] = useState<string | null>(null);

    const activeProviderRef = useRef<AztecSDKWalletProvider | null>(null);

    const pendingResolveRef = useRef<((wallet: AztecWallet) => void) | null>(null);
    const pendingRejectRef = useRef<((error: Error) => void) | null>(null);
    const disconnectUnsubRef = useRef<(() => void) | null>(null);
    const isConfirmingRef = useRef(false);

    const chainInfo = useAztecChainInfo();
    const buildCapabilityManifest = useAztecCapabilityManifest();

    const resetConnection = useCallback(() => {
        disconnectUnsubRef.current?.();
        disconnectUnsubRef.current = null;
        setWallet(null);
        activeProviderRef.current = null;
    }, [setWallet]);

    const connect = useCallback(async (providerId: string): Promise<AztecWallet> => {
        // Read directly from store to avoid stale closures
        let provider = useAztecWalletStore.getState().discoveredProviders.find(p => p.id === providerId);

        // If provider is stale (disconnected), re-discover to get a fresh one
        if (!provider || provider.isDisconnected?.()) {
            const { WalletManager } = await import("@aztec/wallet-sdk/manager");
            const manager = WalletManager.configure({ extensions: { enabled: true } });

            let freshProvider: AztecSDKWalletProvider | null = null;
            const discovery = manager.getAvailableWallets({
                chainInfo: await chainInfo(),
                appId: AZTEC_APP_ID,
                timeout: 30000,
                onWalletDiscovered: (p) => {
                    useAztecWalletStore.getState().addDiscoveredProvider(p);
                    if (p.id === providerId) {
                        freshProvider = p;
                        discovery.cancel();
                    }
                },
            });
            await discovery.done;
            provider = freshProvider ?? undefined;
        }

        if (!provider) {
            throw new Error(`Wallet provider "${providerId}" not found`);
        }

        const { hashToEmoji } = await import("@aztec/wallet-sdk/crypto");

        let pending: PendingConnection;
        try {
            pending = await provider.establishSecureChannel(AZTEC_APP_ID);
        } catch {
            throw new Error("Connection declined by wallet");
        }

        const emojis = hashToEmoji(pending.verificationHash);
        setPendingConnection(pending);
        setVerificationEmojis(emojis);
        activeProviderRef.current = provider;

        return new Promise<AztecWallet>((resolve, reject) => {
            pendingResolveRef.current = resolve;
            pendingRejectRef.current = reject;
        });
    }, [chainInfo]);

    const confirmConnection = useCallback(async () => {
        if (!pendingConnection || isConfirmingRef.current) return;
        isConfirmingRef.current = true;

        try {
            const connectedWallet = await pendingConnection.confirm();
            setWallet(connectedWallet);

            // Request capabilities (accounts, contract registration, scoped simulation/transaction)
            try {
                const manifest = await buildCapabilityManifest();
                await connectedWallet.requestCapabilities(manifest);
            } catch (err) {
                console.warn('requestCapabilities not supported:', err);
            }

            if (activeProviderRef.current) {
                disconnectUnsubRef.current = activeProviderRef.current.onDisconnect(() => {
                    // Grace period to avoid false disconnects from HMR/Fast Refresh
                    setTimeout(() => {
                        const provider = activeProviderRef.current;
                        if (!provider || provider.isDisconnected?.() !== false) {
                            resetConnection();
                        }
                    }, 1000);
                });
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
        } finally {
            isConfirmingRef.current = false;
        }
    }, [pendingConnection, resetConnection, buildCapabilityManifest]);

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
            resetConnection();
        }
    }, [resetConnection]);

    return (
        <AztecWalletContext.Provider value={{
            connect,
            disconnect,
        }}>
            <ActiveAztecAccountProvider>
                {children}
            </ActiveAztecAccountProvider>
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


const EmojiVerificationOverlay: React.FC<{
    emojis: string;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ emojis, onConfirm, onCancel }) => {
    const emojiChars = [...emojis];
    const rows = [
        emojiChars.slice(0, 3),
        emojiChars.slice(3, 6),
        emojiChars.slice(6, 9),
    ];

    return (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-secondary-700 border border-secondary-500 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
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
                        className="flex-1 py-3 px-4 rounded-lg border border-secondary-500 text-secondary-text text-sm font-medium cursor-pointer bg-transparent hover:bg-secondary-500 transition-colors"
                    >
                        Cancel
                    </button>
                    <SubmitButton
                        type="button"
                        onClick={onConfirm}
                    >
                        Emojis Match
                    </SubmitButton>
                </div>
            </div>
        </div>
    );
};