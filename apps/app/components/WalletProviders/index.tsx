import { FC } from "react"
import SolanaProvider from "./SolanaProvider"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import { WalletModalProvider } from "../WalletModal";
import { WalletProvidersProvider } from "../../context/walletHookProviders";
import { AztecWalletProvider } from "./AztecWalletProvider";
import { EvmConnectorsProvider } from "@/context/evmConnectorsContext";
import { WalletBridges } from "../WalletBridges";
import TronProvider from "./TronProvider";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], appName: string | undefined }> = ({ children, appName }) => {
    return (
        <SolanaProvider>
            <TronProvider>
                <StarknetProvider>
                    <EvmConnectorsProvider>
                        <Wagmi>
                            <WalletModalProvider>
                                <AztecWalletProvider>
                                    <WalletProvidersProvider>
                                        <WalletBridges />
                                        {children}
                                    </WalletProvidersProvider>
                                </AztecWalletProvider>
                            </WalletModalProvider>
                        </Wagmi>
                    </EvmConnectorsProvider>
                </StarknetProvider>
            </TronProvider>
        </SolanaProvider>
    )
}

export default WalletsProviders