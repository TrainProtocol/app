import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import type { Wallet as AztecWallet } from "@aztec/aztec.js/wallet";
import type { WalletProvider as AztecSDKWalletProvider, PendingConnection } from "@aztec/wallet-sdk/manager";
import { AZTEC_APP_ID, useAztecCapabilityManifest, useAztecChainInfo } from "@/lib/wallets/aztec/configs";
import { useAztecWalletStore } from "@/stores/aztecWalletStore";
import { ActiveAztecAccountProvider } from "./ActiveAztecAccount";

/**
 * Emoji verification handed to the connection UI. The wallet-sdk secure channel
 * produces a verification hash the user must confirm matches their wallet before
 * the connection completes. Rather than rendering this as a separate top-level
 * overlay (which gets covered by the connect drawer's own portal), we expose it
 * here so the connect flow can render it inline as one of its steps.
 */
export interface AztecPendingVerification {
    emojis: string;
    confirm: () => Promise<void>;
    cancel: () => void;
}

interface AztecWalletContextType {
    connect: (providerId: string) => Promise<AztecWallet>;
    disconnect: () => Promise<void>;
    pendingVerification: AztecPendingVerification | null;
}

const AztecWalletContext = createContext<AztecWalletContextType | undefined>(undefined);

export const AztecWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { setWallet } = useAztecWalletStore();
    const [pendingVerification, setPendingVerification] = useState<AztecPendingVerification | null>(null);

    const activeProviderRef = useRef<AztecSDKWalletProvider | null>(null);
    const disconnectUnsubRef = useRef<(() => void) | null>(null);

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

        const activeProvider = provider;
        const { hashToEmoji } = await import("@aztec/wallet-sdk/crypto");

        let pending: PendingConnection;
        try {
            pending = await activeProvider.establishSecureChannel(AZTEC_APP_ID);
        } catch {
            throw new Error("Connection declined by wallet");
        }

        const emojis = hashToEmoji(pending.verificationHash);
        activeProviderRef.current = activeProvider;

        // Hand the verification to the connect UI and resolve once the user
        // confirms (or reject if they cancel). confirm/cancel close over this
        // connection so there are no stale-closure races between attempts.
        return new Promise<AztecWallet>((resolve, reject) => {
            let settled = false;
            let confirming = false;

            const confirm = async () => {
                if (settled || confirming) return;
                confirming = true;
                try {
                    const connectedWallet = await pending.confirm();
                    setWallet(connectedWallet);

                    // Request capabilities (accounts, contract registration, scoped simulation/transaction)
                    try {
                        const manifest = await buildCapabilityManifest();
                        await connectedWallet.requestCapabilities(manifest);
                    } catch (err) {
                        console.warn('requestCapabilities not supported:', err);
                    }

                    disconnectUnsubRef.current = activeProvider.onDisconnect(() => {
                        // Grace period to avoid false disconnects from HMR/Fast Refresh
                        setTimeout(() => {
                            const p = activeProviderRef.current;
                            if (!p || p.isDisconnected?.() !== false) {
                                resetConnection();
                            }
                        }, 1000);
                    });

                    settled = true;
                    setPendingVerification(null);
                    resolve(connectedWallet);
                } catch (error) {
                    console.error("Error confirming connection:", error);
                    settled = true;
                    setPendingVerification(null);
                    reject(error instanceof Error ? error : new Error(String(error)));
                } finally {
                    confirming = false;
                }
            };

            const cancel = () => {
                if (settled || confirming) return;
                settled = true;
                try {
                    pending.cancel();
                } catch {
                    /* channel may already be torn down */
                }
                setPendingVerification(null);
                reject(new Error("Connection cancelled by user"));
            };

            setPendingVerification({ emojis, confirm, cancel });
        });
    }, [chainInfo, setWallet, buildCapabilityManifest, resetConnection]);

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
            pendingVerification,
        }}>
            <ActiveAztecAccountProvider>
                {children}
            </ActiveAztecAccountProvider>
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
