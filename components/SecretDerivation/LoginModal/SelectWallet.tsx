import WalletIcon from "@/components/Icons/WalletIcon";
import shortenAddress from "@/components/utils/ShortenAddress";
import { useConnectModal } from "@/components/WalletModal";
import useWallet from "@/hooks/useWallet";
import { Wallet } from "@/Models/WalletProvider";
import { Plus } from "lucide-react";

interface WalletSelectProps {
    startWalletLogin: (wallet: Wallet) => void;
}

const WalletSelect = ({  startWalletLogin }: WalletSelectProps) => {
    const { providers } = useWallet();
    const evmProvider = providers.find(p => p.name.toLowerCase() === 'evm');
    const connectedWallets = evmProvider?.connectedWallets || [];

    const { connect } = useConnectModal();

    return (
        <>
            <p className="text-sm text-secondary-text">Select a connected EVM wallet</p>

            <div className="flex flex-col gap-2 mt-4">
                {connectedWallets.length === 0 && (
                    <div className="text-sm text-secondary-text bg-secondary-800 border border-secondary-700 rounded-xl p-4">
                        No EVM wallets connected.
                    </div>
                )}
                {connectedWallets.map((wallet) => (
                    <button
                        key={wallet.address}
                        type="button"
                        onClick={() => startWalletLogin(wallet)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-secondary-700 bg-secondary-800 hover:border-secondary-600"
                    >
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-secondary-700 flex items-center justify-center">
                            {wallet.icon ? <wallet.icon /> : <WalletIcon className="w-5 h-5 text-primary-text" />}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="text-primary-text font-semibold">{wallet.displayName || 'EVM Wallet'}</div>
                            <div className="text-xs text-secondary-text">{shortenAddress(wallet.address)}</div>
                        </div>
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={() => connect(evmProvider)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 mt-4 rounded-xl font-semibold border-2 border-secondary-700 bg-secondary-800 text-primary-text hover:bg-secondary-700 transition-colors"
            >
                <Plus className="w-4 h-4" />
                Connect new wallet
            </button>
        </>
    );
};

export default WalletSelect;