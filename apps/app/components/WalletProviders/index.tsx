import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import { ThemeData } from "../../Models/Theme"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import { ImtblPassportProvider } from "./ImtblPassportProvider";
import { WalletModalProvider } from "../WalletModal";
import { WalletProvidersProvider } from "../../context/walletHookProviders";
import { AztecWalletProvider } from "./AztecWalletProvider";
import { EvmConnectorsProvider } from "@/context/evmConnectorsContext";
import { SecretDerivationProvider } from "@/context/secretDerivationContext";
import { WalletLoginProvider } from "@/context/walletLoginContext";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], basePath: string, themeData: ThemeData, appName: string | undefined }> = ({ children, basePath, themeData, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} themeData={themeData} appName={appName}>
            <SolanaProvider>
                <StarknetProvider>
                    <EvmConnectorsProvider>
                        <Wagmi>
                            <WalletModalProvider>
                                <AztecWalletProvider>
                                    <ImtblPassportProvider>
                                        <WalletProvidersProvider>
                                            <WalletLoginProvider>
                                                <SecretDerivationProvider>
                                                    {children}
                                                </SecretDerivationProvider>
                                            </WalletLoginProvider>
                                        </WalletProvidersProvider>
                                    </ImtblPassportProvider>
                                </AztecWalletProvider>
                            </WalletModalProvider>
                        </Wagmi>
                    </EvmConnectorsProvider>
                </StarknetProvider>
            </SolanaProvider>
        </TonConnectProvider>
    )
}

export default WalletsProviders