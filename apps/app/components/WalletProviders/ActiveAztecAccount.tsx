import { Context, FC, createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { useWalletStore } from '@/stores/walletStore';

type ActiveAccountState = {
    activeAddress: string | undefined
    setActiveAddress: (address: string) => void
}

const ActiveAztecAccountContext = createContext<ActiveAccountState | undefined>(undefined);

type Props = {
    children?: ReactNode;
}

export const ActiveAztecAccountProvider: FC<Props> = ({ children }) => {
    const [selectedAddress, setSelectedAddress] = useState<string>()

    const wallets = useWalletStore((state) => state.connectedWallets)
    const aztecWallet = wallets.find(w => w.providerName === 'Aztec')

    const activeAddress = useMemo(() => {
        const isSelectedAddressActive = aztecWallet?.addresses?.some(addr => addr === selectedAddress)
        return isSelectedAddressActive ? selectedAddress : aztecWallet?.address
    }, [aztecWallet, selectedAddress])

    const setActiveAddress = useCallback((address: string) => {
        setSelectedAddress(address)
    }, [])

    return (
        <ActiveAztecAccountContext.Provider value={{ activeAddress, setActiveAddress }}>
            {children}
        </ActiveAztecAccountContext.Provider>
    )
}

export function useActiveAztecAccount() {
    const data = useContext(ActiveAztecAccountContext as Context<ActiveAccountState>)
    if (!data) {
        throw new Error('useActiveAztecAccount must be used within an ActiveAztecAccountProvider')
    }
    return data
}
