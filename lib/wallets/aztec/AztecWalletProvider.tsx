import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { dappMetadata, aztecChain } from "./configs";

type AztecWalletInstance = Awaited<ReturnType<typeof import("@azguardwallet/aztec-wallet").AztecWallet.connect>>;
type AztecAccount = Awaited<ReturnType<AztecWalletInstance["getAccounts"]>>[0];

interface AztecWalletContextType {
    wallet: AztecWalletInstance | null;
    account: AztecAccount | null;
    connected: boolean;
    accountAddress: string | null;
    isInstalled: boolean;
    isInstalledLoading: boolean;
    checkInstallation: () => Promise<boolean>;
    connect: () => Promise<AztecWalletInstance>;
    disconnect: () => Promise<void>;
}

const AztecWalletContext = createContext<AztecWalletContextType | undefined>(undefined);

export const AztecWalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<AztecWalletInstance | null>(null);
    const [account, setAccount] = useState<AztecAccount | null>(null);
    const [connected, setConnected] = useState(false);
    const [accountAddress, setAccountAddress] = useState<string | null>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstalledLoading, setIsInstalledLoading] = useState(true);

    // Check if Azguard is installed
    const checkInstallation = useCallback(async (timeout?: number): Promise<boolean> => {
        if (typeof window === 'undefined') {
            setIsInstalled(false);
            setIsInstalledLoading(false);
            return false;
        }

        try {
            setIsInstalledLoading(true);
            const { AzguardClient } = await import("@azguardwallet/client");
            const installed = await AzguardClient.isAzguardInstalled(timeout);
            setIsInstalled(installed);
            setIsInstalledLoading(false);
            return installed;
        } catch (error) {
            console.error("Error checking if Azguard is installed:", error);
            setIsInstalled(false);
            setIsInstalledLoading(false);
            return false;
        }
    }, []);

    // Initialize wallet on mount - check installation and localStorage for previous connection
    useEffect(() => {
        let mounted = true;

        const initializeWallet = async () => {
            try {
                // First check if Azguard is installed
                if (!mounted) return;

                const installed = await checkInstallation();

                if (!installed) {
                    return; // Don't proceed if extension is not installed
                }

                // Check localStorage for previous connection
                const wasConnected = typeof window !== 'undefined' && localStorage.getItem("aztec_wallet_connected") === 'true';
                
                if (wasConnected) {
                    // If previously connected, restore connection (won't trigger popup)
                    try {
                        const { AztecWallet } = await import("@azguardwallet/aztec-wallet");
                        const walletInstance = await AztecWallet.connect(dappMetadata, aztecChain);
                        
                        if (!mounted) return;
                        
                        setWallet(walletInstance);
                        setConnected(walletInstance.connected);
                        
                        if (walletInstance.connected) {
                            const accounts = await walletInstance.getAccounts();
                            if (accounts.length > 0) {
                                setAccount(accounts[0]);
                                setAccountAddress(accounts[0].item.toString());
                            }
                        }

                        // Set up connection listeners
                        walletInstance.onConnected.addHandler(() => {
                            if (mounted) {
                                setConnected(true);
                                if (typeof window !== 'undefined') {
                                    localStorage.setItem("aztec_wallet_connected", 'true');
                                }
                                walletInstance.getAccounts().then(accounts => {
                                    if (accounts.length > 0 && mounted) {
                                        setAccount(accounts[0]);
                                        setAccountAddress(accounts[0].item.toString());
                                    }
                                });
                            }
                        });

                        walletInstance.onDisconnected.addHandler(() => {
                            if (mounted) {
                                setConnected(false);
                                if (typeof window !== 'undefined') {
                                    localStorage.removeItem("aztec_wallet_connected");
                                }
                                setAccount(null);
                                setAccountAddress(null);
                            }
                        });
                    } catch (error) {
                        // If connection fails, clear stored state
                        console.error("Error restoring wallet connection:", error);
                        if (typeof window !== 'undefined') {
                            localStorage.removeItem("aztec_wallet_connected");
                        }
                    }
                }
            } catch (error) {
                console.error("Error initializing wallet:", error);
            }
        };

        initializeWallet();

        return () => {
            mounted = false;
        };
    }, [checkInstallation]);

    const connect = useCallback(async () => {
        try {
            if (typeof window === 'undefined') {
                throw new Error("Aztec wallet can only be used on the client side");
            }
            
            const { AztecWallet } = await import("@azguardwallet/aztec-wallet");
            const walletInstance = await AztecWallet.connect(dappMetadata, aztecChain);
            
            setWallet(walletInstance);
            setConnected(walletInstance.connected);

            const accounts = await walletInstance.getAccounts();
            const connectedAddress = accounts[0]?.item.toString();
            
            if (accounts.length > 0) {
                setAccount(accounts[0]);
            }
            
            if (connectedAddress) {
                setAccountAddress(connectedAddress);
            }

            // Store connection state in localStorage
            localStorage.setItem("aztec_wallet_connected", 'true');

            // Set up connection listeners
            walletInstance.onConnected.addHandler(() => {
                setConnected(true);
                localStorage.setItem("aztec_wallet_connected", 'true');
                walletInstance.getAccounts().then(accounts => {
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        setAccountAddress(accounts[0].item.toString());
                    }
                });
            });

            walletInstance.onDisconnected.addHandler(() => {
                setConnected(false);
                localStorage.removeItem("aztec_wallet_connected");
                setAccount(null);
                setAccountAddress(null);
            });

            return walletInstance;
        } catch (error) {
            console.error("Error connecting Azguard:", error);
            // Clear stored state on error
            if (typeof window !== 'undefined') {
                localStorage.removeItem("aztec_wallet_connected");
            }
            throw error;
        }
    }, []);

    const disconnect = useCallback(async () => {
        try {
            if (wallet) {
                await wallet.disconnect();
                setWallet(null);
                setConnected(false);
                setAccount(null);
                setAccountAddress(null);
                // Clear connection state from localStorage
                if (typeof window !== 'undefined') {
                    localStorage.removeItem("aztec_wallet_connected");
                }
            }
        } catch (error) {
            console.error("Error disconnecting Azguard:", error);
            // Clear stored state on error
            if (typeof window !== 'undefined') {
                localStorage.removeItem("aztec_wallet_connected");
            }
            throw error;
        }
    }, [wallet]);

    return (
        <AztecWalletContext.Provider value={{ 
            wallet, 
            account, 
            connected, 
            accountAddress, 
            isInstalled,
            isInstalledLoading,
            checkInstallation,
            connect, 
            disconnect 
        }}>
            {children}
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

