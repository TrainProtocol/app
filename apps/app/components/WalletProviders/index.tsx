import { FC } from "react"
import Wagmi from "./Wagmi";
import { WalletModalProvider } from "../WalletModal";
import { AztecWalletProvider } from "./AztecWalletProvider";
import { WalletBridges } from "../WalletBridges";
import ConnectWalletDrawer from "../WalletModal/ConnectWalletDrawer";
import LayerswapRegistry from "./LayerswapRegistry";
import { AztecWalletAdapterHydrator } from "@/lib/wallets/aztec/adapter";
import { TrainWalletListAdapters } from "../Wallet/walletListAdapters";

const WalletsProviders: FC<{ children: JSX.Element | JSX.Element[] }> = ({ children }) => {
    return (
        <Wagmi>
            <WalletModalProvider>
                <AztecWalletProvider>
                    <LayerswapRegistry>
                        <AztecWalletAdapterHydrator />
                        <TrainWalletListAdapters>
                            <WalletBridges />
                            <ConnectWalletDrawer />
                            {children}
                        </TrainWalletListAdapters>
                    </LayerswapRegistry>
                </AztecWalletProvider>
            </WalletModalProvider>
        </Wagmi>
    )
}

export default WalletsProviders
