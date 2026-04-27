import React, { createContext, useContext, useMemo } from "react";
import { WalletProvider } from "../Models/WalletProvider";
import { useSettingsState } from "./settings";
import IconButton from "../components/buttons/iconButton";
import { ChevronLeft } from "lucide-react";
import ConnectorsList from "../components/WalletModal/ConnectorsList";
import { useConnectModal } from "../components/WalletModal";
import useEVM from "../lib/wallets/evm/useEVM";
import useStarknet from "../lib/wallets/starknet/useStarknet";
import useSVM from "../lib/wallets/solana/useSVM";
import VaulDrawer from "../components/Modal/vaulModal";
import useAztec from "../lib/wallets/aztec/useAztec";
import { isMobile } from "@/lib/wallets/utils/isMobile";
import useTron from "@/lib/wallets/tron/useTron";

const WalletProvidersContext = createContext<WalletProvider[]>([]);

export const WalletProvidersProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const { networks } = useSettingsState();
    const isMobilePlatform = isMobile();
    const { goBack, onFinish, open, setOpen, selectedConnector, selectedMultiChainConnector } = useConnectModal()

    const evm = useEVM();
    const starknet = useStarknet();
    const svm = useSVM();
    const aztec = useAztec()
    const tron = useTron()

    const providers = useMemo(() => {
        const allProviders: WalletProvider[] = [
            evm, starknet, svm, aztec, tron
        ];
        const filteredProviders = allProviders.filter(provider => isMobilePlatform ? !provider.unsupportedPlatforms?.includes('mobile') : !provider.unsupportedPlatforms?.includes('desktop'));

        return filteredProviders
            .filter(provider =>
                networks.some(net =>
                    provider.autofillSupportedNetworks?.includes(net.caip2Id) ||
                    provider.withdrawalSupportedNetworks?.includes(net.caip2Id) ||
                    provider.asSourceSupportedNetworks?.includes(net.caip2Id)
                )
            );
    }, [networks, evm, starknet, svm, aztec, tron, isMobilePlatform]);

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
                            (selectedConnector || selectedMultiChainConnector) &&
                            <div className="sm:-ml-2 ml-0">
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft className="h-6 w-6" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <p>{(selectedMultiChainConnector && !selectedConnector) ? "Select ecosystem" : "Connect wallet"}</p>
                    </div>
                }>
                 <VaulDrawer.Snap openFullHeight id='item-1' className="h-full">
                    <ConnectorsList onFinish={onFinish} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </WalletProvidersContext.Provider>
    );
};

export const useWalletProviders = () => useContext(WalletProvidersContext);