import { FC } from "react"
import SolanaProvider from "./SolanaProvider"
import Wagmi from "./Wagmi";
import StarknetProvider from "./StarknetProvider";
import { WalletModalProvider } from "../WalletModal";
import { WalletProvidersProvider } from "../../context/walletHookProviders";
import { AztecWalletProvider } from "./AztecWalletProvider";
import { WalletBridges } from "../WalletBridges";
import TronProvider from "./TronProvider";
import ConnectWalletDrawer from "../WalletModal/ConnectWalletDrawer";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[], appName: string | undefined }> = ({ children, appName }) => {
    return (
        <SolanaProvider>
            <TronProvider>
                <StarknetProvider>
                    <Wagmi>
                        <WalletModalProvider>
                            <AztecWalletProvider>
                                <WalletProvidersProvider>
                                    <WalletBridges />
                                    <ConnectWalletDrawer />
                                    {children}
                                </WalletProvidersProvider>
                            </AztecWalletProvider>
                        </WalletModalProvider>
                    </Wagmi>
                </StarknetProvider>
            </TronProvider>
        </SolanaProvider>
    )
}

export default WalletsProviders