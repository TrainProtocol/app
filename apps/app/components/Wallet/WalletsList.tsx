import { ComponentProps, FC } from "react";
import { WalletsList as BaseWalletsList, WalletItem as BaseWalletItem } from "@layerswap/ui-kit";
import type { Token as WidgetToken } from "@layerswap/widget-types";
import { toWidgetNetwork } from "@/lib/wallets/layerswap/widgetNetwork";
import { ConnectNewWalletButton } from "./ConnectNewWalletButton";
import { Network, Token } from "@/Models/Network";

type TrainShaped<P> = Omit<P, "network" | "token"> & { network?: Network; token?: Token }

const renderConnectButton = (connect: () => void) => <ConnectNewWalletButton onClick={connect} />

const WalletsList: FC<TrainShaped<ComponentProps<typeof BaseWalletsList>>> = ({ network, token, ...props }) => (
    <BaseWalletsList {...props} network={network && toWidgetNetwork(network)} token={token as WidgetToken | undefined} renderConnectButton={renderConnectButton} />
)

export const WalletItem: FC<TrainShaped<ComponentProps<typeof BaseWalletItem>>> = ({ network, token, ...props }) => (
    <BaseWalletItem {...props} network={network && toWidgetNetwork(network)} token={token as WidgetToken | undefined} />
)

export default WalletsList
