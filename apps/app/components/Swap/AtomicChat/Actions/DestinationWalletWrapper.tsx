import { FC, ReactNode } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import useWallet from "@/hooks/useWallet";
import { hasRequiredDestinationWallet } from "@/lib/wallets/utils/destinationWalletUtils";
import { useConnectModal } from "../../../WalletModal";
import { PlusIcon } from "lucide-react";
import { useSettingsState } from "@/context/settings";
import { ActionWrapper, SwapViewType } from ".";

interface DestinationWalletWrapperProps {
    children: ReactNode;
    type: SwapViewType;
}

/**
 * Wrapper component that checks if destination wallet connection is required
 * and shows connection UI if needed, otherwise renders children
 */
const DestinationWalletWrapper: FC<DestinationWalletWrapperProps> = ({ children, type }) => {
    const { destinationNetwork, sourceNetwork } = useActiveSwap();
    const { networks } = useSettingsState()
    const resolvedSourceNetwork = networks.find(n => n.caip2Id == sourceNetwork?.caip2Id)
    const resolvedDestinationNetwork = networks.find(n => n.caip2Id == destinationNetwork?.caip2Id)

    const { providers, provider: destProvider } = useWallet(resolvedDestinationNetwork, 'withdrawal');
    const { provider: sourceProvider } = useWallet(resolvedSourceNetwork, 'withdrawal');
    const { connect } = useConnectModal();

    // Check if destination wallet is required and connected
    const needsDestinationWallet = !hasRequiredDestinationWallet(resolvedDestinationNetwork, providers);
    const needsSourceWallet = !hasRequiredDestinationWallet(resolvedSourceNetwork, providers);

    const handleConnect = async () => {
        const result = await connect((needsDestinationWallet ? destProvider : sourceProvider) ?? undefined);
        return result;
    };

    const availableDestWallets = destProvider?.connectedWallets?.filter(w => !w.isNotAvailable) || [];
    const availableSourceWallets = sourceProvider?.connectedWallets?.filter(w => !w.isNotAvailable) || [];

    if ((needsDestinationWallet || needsSourceWallet) && (!availableDestWallets.length || !availableSourceWallets.length) && destinationNetwork) {
        return (
            <ActionWrapper type={type}>
                <div className="border border-secondary-400 disabled:border-secondary-500 items-center space-x-1 disabled:text-opacity-40 disabled:bg-secondary-600 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-xl transform hover:brightness-125 transition duration-200 ease-in-out bg-actionButtonColor text-primary-buttonTextColor py-3 px-2 md:px-3"
                    onClick={handleConnect}>
                    <div className="flex justify-center space-x-2">
                        <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                            <PlusIcon className="stroke-1" />
                        </span>
                        <span className="grow text-center">Connect {needsDestinationWallet ? destinationNetwork.displayName : sourceNetwork?.displayName} wallet</span>
                    </div>
                </div>
            </ActionWrapper>
        );
    }

    return <>{children}</>;
};

export default DestinationWalletWrapper;
