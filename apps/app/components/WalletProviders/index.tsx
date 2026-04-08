import { FC } from "react"
import TonConnectProvider from "./TonConnectProvider"
import SolanaProvider from "./SolanaProvider"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import { WalletModalProvider } from "../WalletModal";
import { WalletProvidersProvider } from "../../context/walletHookProviders";
import { AztecWalletProvider } from "./AztecWalletProvider";
import { EvmConnectorsProvider } from "@/context/evmConnectorsContext";
import { WalletBridges } from "../WalletBridges";
import FuelProviderWrapper from "./FuelProvider";
import TronProvider from "./TronProvider";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], basePath: string, appName: string | undefined }> = ({ children, basePath, appName }) => {
    return (
        <TonConnectProvider basePath={basePath} appName={appName}>
            <SolanaProvider>
                <TronProvider>
                    <StarknetProvider>
                        <EvmConnectorsProvider>
                            <Wagmi>
                                <WalletModalProvider>
                                    <FuelProviderWrapper>
                                        <AztecWalletProvider>
                                            <WalletProvidersProvider>
                                                <WalletBridges />
                                                {children}
                                            </WalletProvidersProvider>
                                        </AztecWalletProvider>
                                    </FuelProviderWrapper>
                                </WalletModalProvider>
                            </Wagmi>
                        </EvmConnectorsProvider>
                    </StarknetProvider>
                </TronProvider>
            </SolanaProvider>
        </TonConnectProvider>
    )
}

export default WalletsProviders