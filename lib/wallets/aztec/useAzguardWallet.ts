import { useState, useEffect } from "react";
import { getWalletInstance, clearWalletInstance } from "./configs";

export function useAzguardWallet() {
    const [aztecWalletInstance, setAztecWalletInstance] = useState<Awaited<ReturnType<typeof import("@azguardwallet/aztec-wallet").AztecWallet.connect>> | null>(null);
    const [connected, setConnected] = useState(false);
    const [accountAddress, setAccountAddress] = useState<string | null>(null);

    // Initialize wallet instance and set up connection listeners
    useEffect(() => {
        let mounted = true;

        const initializeWallet = async () => {
            try {
                const wallet = await getWalletInstance();
                if (!mounted) return;

                setAztecWalletInstance(wallet);
                setConnected(wallet.connected);
                
                if (wallet.connected) {
                    const accounts = await wallet.getAccounts();
                    if (accounts.length > 0) {
                        setAccountAddress(accounts[0].item.toString());
                    }
                }

                // Set up connection listeners
                wallet.onConnected.addHandler(() => {
                    if (mounted) {
                        setConnected(true);
                        wallet.getAccounts().then(accounts => {
                            if (accounts.length > 0 && mounted) {
                                setAccountAddress(accounts[0].item.toString());
                            }
                        });
                    }
                });

                wallet.onDisconnected.addHandler(() => {
                    if (mounted) {
                        setConnected(false);
                        setAccountAddress(null);
                    }
                });
            } catch (error) {
                console.error("Error initializing Aztec wallet:", error);
            }
        };

        initializeWallet();

        return () => {
            mounted = false;
        };
    }, []);

    const connect = async () => {
        try {
            if (typeof window === 'undefined') {
                throw new Error("Aztec wallet can only be used on the client side");
            }
            
            const { AztecWallet } = await import("@azguardwallet/aztec-wallet");
            const wallet = await AztecWallet.connect();
            setAztecWalletInstance(wallet);
            setConnected(wallet.connected);

            const accounts = await wallet.getAccounts();
            const connectedAddress = accounts[0]?.item.toString();
            
            if (connectedAddress) {
                setAccountAddress(connectedAddress);
            }

            return wallet;
        } catch (error) {
            console.error("Error connecting Azguard:", error);
            throw error;
        }
    };

    const disconnect = async () => {
        try {
            if (aztecWalletInstance) {
                await aztecWalletInstance.disconnect();
                clearWalletInstance();
                setAztecWalletInstance(null);
                setConnected(false);
                setAccountAddress(null);
            }
        } catch (error) {
            console.error("Error disconnecting Azguard:", error);
            throw error;
        }
    };

    return {
        wallet: aztecWalletInstance,
        connected,
        accountAddress,
        connect,
        disconnect,
    };
}

