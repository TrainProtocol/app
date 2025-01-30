import { Context, useState, createContext, useContext } from 'react'
import { Wallet } from '../Models/WalletProvider';
import useWallet from '../hooks/useWallet';

export const SwapDataStateContext = createContext<SwapData>({});

export const SwapDataUpdateContext = createContext<UpdateInterface | null>(null);

export type UpdateInterface = {
    setSelectedSourceAccount: (value: { wallet: Wallet, address: string } | undefined) => void
}

export type SwapData = {
    selectedSourceAccount?: { wallet: Wallet, address: string }
}

export function SwapDataProvider({ children }) {

    const { providers } = useWallet()

    const [selectedSourceAccount, setSelectedSourceAccount] = useState<{ wallet: Wallet, address: string } | undefined>()

    const handleChangeSelectedSourceAccount = (props: { wallet: Wallet, address: string } | undefined) => {
        if (!props) {
            setSelectedSourceAccount(undefined)
            return
        }
        const { wallet, address } = props || {}
        const provider = providers?.find(p => p.name === wallet.providerName)
        if (provider?.activeWallet?.address.toLowerCase() !== address.toLowerCase()) {
            provider?.switchAccount && provider?.switchAccount(wallet, address)
        }
        setSelectedSourceAccount({ wallet, address })
    }

    const updateFns: UpdateInterface = {
        setSelectedSourceAccount: handleChangeSelectedSourceAccount
    };
    return (
        <SwapDataStateContext.Provider value={{
            selectedSourceAccount
        }}>
            <SwapDataUpdateContext.Provider value={updateFns}>
                {children}
            </SwapDataUpdateContext.Provider>
        </SwapDataStateContext.Provider>
    );
}

export function useSwapDataState() {
    const data = useContext(SwapDataStateContext);

    if (data === undefined) {
        throw new Error('swapData must be used within a SwapDataProvider');
    }
    return data;
}

export function useSwapDataUpdate() {
    const updateFns = useContext<UpdateInterface>(SwapDataUpdateContext as Context<UpdateInterface>);
    if (updateFns === undefined) {
        throw new Error('useSwapDataUpdate must be used within a SwapDataProvider');
    }

    return updateFns;
}