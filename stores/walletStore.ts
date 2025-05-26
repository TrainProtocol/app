import { create } from 'zustand'
import { Wallet } from '../Models/WalletProvider';

interface WalletState {
    connectedWallets: Wallet[];
    connectWallet: (wallet: Wallet) => void;
    disconnectWallet: (providerName: string, connectorName?: string) => void;
    selectedProvider?: string;
    selectProvider: (providerName: string) => void;
}

export const useWalletStore = create<WalletState>()((set) => ({
    connectedWallets: [],
    selectProvider: (providerName) => set({ selectedProvider: providerName }),
    //    As we are calling this method for adding wallets to the store from provider hooks,
    // in some providers they are called from useEffect hooks so are triggered multiple times,
    // we check if the wallet is already connected do not modify the state
    // TODO: get rid of useEffect hooks and implement singelton pattern
    connectWallet: (wallet) => set((state) => {
        const existingWallet = state.connectedWallets.find(w => w.providerName == wallet.providerName && w.id == wallet.id && w.address == wallet.address);
        if (existingWallet) {
            return {
                connectedWallets: [
                    ...state.connectedWallets.filter(w => !(w.providerName == wallet.providerName && w.id == wallet.id && w.address == wallet.address)),
                    wallet
                ]
            }
        }
        return ({
            connectedWallets: [
                ...state.connectedWallets,
                wallet
            ]
        })
    }),
    disconnectWallet: (providerName, connectorName) => set((state) => ({
        connectedWallets: state.connectedWallets.filter(w => connectorName ? !(w.providerName == providerName && w.id == connectorName) : w.providerName != providerName)
    }))
}))