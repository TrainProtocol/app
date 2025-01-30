import RainbowIcon from "./Wallets/Rainbow";
import MetaMaskIcon from "./Wallets/MetaMask";
import WalletConnectIcon from "./Wallets/WalletConnect";
import Braavos from "./Wallets/Braavos";
import ArgentX from "./Wallets/ArgentX";
import Argent from "./Wallets/Argent";
import Phantom from "./Wallets/Phantom";
import CoinbaseIcon from "./Wallets/Coinbase";
import { Mail } from "lucide-react";
import Fuel from "./Wallets/Fuel";
import BakoSafe from "./Wallets/BakoSafe";
import Ethereum from "./Wallets/Ethereum";
import Solana from "./Wallets/Solana";
import TonKeeper from "./Wallets/TonKeeper";
import OpenMask from "./Wallets/OpenMask";
import TON from "./Wallets/TON";
import MyTonWallet from "./Wallets/MyTonWallet";
import GlowIcon from "./Wallets/Glow";

export const ResolveConnectorIcon = ({
    connector,
    iconClassName,
    className,
}: {
    connector: string;
    iconClassName: string;
    className?: string;
}) => {
    switch (connector.toLowerCase()) {
        case KnownConnectors.EVM:
            return (
                <IconsWrapper className={className}>
                    <MetaMaskIcon className={iconClassName} />
                    <WalletConnectIcon className={iconClassName} />
                    <RainbowIcon className={iconClassName} />
                    <Phantom className={iconClassName} />
                </IconsWrapper>
            );
        case KnownConnectors.Starknet:
            return (
                <IconsWrapper className={className}>
                    <Braavos className={iconClassName} />
                    <Argent className={iconClassName} />
                    <ArgentX className={iconClassName} />
                    <Mail className={`p-1.5 ${iconClassName}`} />
                </IconsWrapper>
            );
        case KnownConnectors.TON:
            return (
                <IconsWrapper className={className}>
                    <TonKeeper className={iconClassName} />
                    <OpenMask className={iconClassName} />
                    <TON className={iconClassName} />
                    <MyTonWallet className={iconClassName} />
                </IconsWrapper>
            );
        case KnownConnectors.Solana:
            return (
                <IconsWrapper className={className}>
                    <CoinbaseIcon className={iconClassName} />
                    <WalletConnectIcon className={iconClassName} />
                    <Phantom className={iconClassName} />
                    <GlowIcon className={iconClassName} />
                </IconsWrapper>
            );
        case KnownConnectors.Fuel:
            return (
                <IconsWrapper className={className}>
                    <Fuel className={iconClassName} />
                    <BakoSafe className={iconClassName} />
                    <Ethereum className={iconClassName} />
                    <Solana className={iconClassName} />
                </IconsWrapper>
            );
        default:
            return <></>;
    }
};

const IconsWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return <div className={className ?? "-space-x-2 flex"}>{children}</div>;
}

const KnownConnectors = {
    Starknet: "starknet",
    EVM: "evm",
    TON: "ton",
    Solana: "solana",
    Glow: "glow",
    Fuel: "fuel",
};