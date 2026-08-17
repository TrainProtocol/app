import { FC } from "react"
import Wagmi from "./Wagmi";
import { WalletModalProvider } from "../WalletModal";
import { WalletProvidersProvider } from "@/context/walletHookProviders";
import { AztecWalletProvider } from "./AztecWalletProvider";
import { WalletBridges } from "../WalletBridges";
import ConnectWalletDrawer from "../WalletModal/ConnectWalletDrawer";
import LayerswapRegistry from "./LayerswapRegistry";
import { AztecWalletAdapterHydrator } from "@/lib/wallets/aztec/adapter";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[] }> = ({ children }) => {
    return (
        <Wagmi>
            <WalletModalProvider>
                <AztecWalletProvider>
                    <LayerswapRegistry>
                        <AztecWalletAdapterHydrator />
                        <WalletProvidersProvider>
                            <WalletBridges />
                            <ConnectWalletDrawer />
                            {children}
                        </WalletProvidersProvider>
                    </LayerswapRegistry>
                </AztecWalletProvider>
            </WalletModalProvider>
        </Wagmi>
    )
}

export default WalletsProviders
