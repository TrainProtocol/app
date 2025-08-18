import React, { createContext, useContext, useMemo } from "react";
import { WalletProvider } from "../Models/WalletProvider";
import { useSettingsState } from "./settings";
import IconButton from "../components/buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import ConnectorsList from "../components/WalletModal/ConnectorsList";
import { useConnectModal } from "../components/WalletModal";
import useEVM from "../lib/wallets/evm/useEVM";
import useStarknet from "../lib/wallets/starknet/useStarknet";
import useTON from "../lib/wallets/ton/useTON";
import useFuel from "../lib/wallets/fuel/useFuel";
import useSVM from "../lib/wallets/solana/useSVM";
import VaulDrawer from "../components/Modal/vaulModal";
// import useAztec from "../lib/wallets/aztec/useAztec";

const WalletProvidersContext = createContext<WalletProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { networks } = useSettingsState();
    const { goBack, onFinish, open, setOpen, selectedConnector } = useConnectModal()

    const evm = useEVM();
    const starknet = useStarknet();
    const svm = useSVM();
    const ton = useTON();
    const fuel = useFuel();
    // const aztec = useAztec()

    const providers = useMemo(() => {
        const allProviders: WalletProvider[] = [
            evm, starknet, svm, ton, fuel//, aztec
        ];

        return allProviders.filter(provider =>
            networks.some(net =>
                provider.autofillSupportedNetworks?.includes(net.name) ||
                provider.withdrawalSupportedNetworks?.includes(net.name) ||
                provider.asSourceSupportedNetworks?.includes(net.name)
            )
        );
    }, [networks, evm, starknet, svm, ton, fuel]);

    return (
        <WalletProvidersContext.Provider value={providers}>
            {children}
            <VaulDrawer
                show={open}
                setShow={setOpen}
                onClose={onFinish}
                modalId={"connectNewWallet"}
                header={
                    <div className="flex items-center gap-1">
                        {
                            selectedConnector &&
                            <div className='-ml-2'>
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>Connect wallet</p>
                    </div>
                }>
                <VaulDrawer.Snap id='item-1'>
                    <ConnectorsList onFinish={onFinish} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </WalletProvidersContext.Provider>
    );
};

export const useWalletProviders = () => useContext(WalletProvidersContext);