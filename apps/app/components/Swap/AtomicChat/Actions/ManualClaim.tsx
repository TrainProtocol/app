import { FC } from "react";
import { useSwapData } from "@/hooks/useSwapData";
import { useSwapState, useSwap } from "@train-protocol/react";
import useWallet from "@/hooks/useWallet";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { SwapViewType } from ".";

export const ManualClaimAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { destination_network, hashlock } = useSwapData();
    const { sourceDetails, destRedeemTxId } = useSwapState();
    const { manualClaim, setError } = useSwap();

    const { provider } = useWallet(destination_network, 'withdrawal');
    const wallet = provider?.activeWallet;

    const handleManualClaim = async () => {
        try {
            if (!hashlock) throw new Error("No hashlock");
            if (!sourceDetails?.secret) throw new Error("Secret not available");
            if (!destination_network) throw new Error("No destination network");

            if (provider?.activeWallet && (provider.activeWallet.chainId != destination_network.chainId) && provider.switchChain)
                await provider.switchChain(provider.activeWallet, destination_network.chainId);

            await manualClaim(sourceDetails.secret.toString());

            posthog.capture("ManualClaim", {
                hashlock,
                destinationNetwork: destination_network.caip2Id,
            });
        } catch (e: any) {
            setError(new Error(e.details || e.message));
        }
    };

    if (!destination_network || destRedeemTxId) return <></>;

    return (
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <WalletActionButton
                activeChain={wallet?.chainId}
                isConnected={!!wallet}
                network={destination_network}
                networkChainId={destination_network.chainId}
                onClick={handleManualClaim}
                type={type}
            >
                Claim Assets
            </WalletActionButton>
        </div>
    );
};
