import { FC, ReactNode } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import useWallet from "../../../../hooks/useWallet";
import { hasRequiredDestinationWallet } from "../../../../lib/wallets/utils/destinationWalletUtils";
import { useConnectModal } from "../../../WalletModal";
import { PlusIcon } from "lucide-react";

interface DestinationWalletWrapperProps {
    children: ReactNode;
}

/**
 * Wrapper component that checks if destination wallet connection is required
 * and shows connection UI if needed, otherwise renders children
 */
const DestinationWalletWrapper: FC<DestinationWalletWrapperProps> = ({ children }) => {
    const { destination_network } = useAtomicState();
    const { providers, provider } = useWallet(destination_network, 'autofil');
    const { connect } = useConnectModal();

    // Check if destination wallet is required and connected
    const needsDestinationWallet = !hasRequiredDestinationWallet(destination_network, providers);

    const handleConnect = async () => {
        const result = await connect(provider);
        return result;
    };

    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || [];

    if (needsDestinationWallet && !availableWallets.length && destination_network) {
        return (
            <div className="border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-componentRoundness transform hover:brightness-125 transition duration-200 ease-in-out bg-primary text-primary-actionButtonText py-3 px-2 md:px-3 plausible-event-name=Connect+Destination+Wallet"
                onClick={handleConnect}>
                <div className="flex justify-center space-x-2">
                    <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                        <PlusIcon className="stroke-1" />
                    </span>
                    <span className="grow text-center">Connect {destination_network.displayName} wallet</span>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default DestinationWalletWrapper;