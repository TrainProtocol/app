import { FC } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import { useManualClaim } from "@train-protocol/react";
import useWallet from "@/hooks/useWallet";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { SwapViewType } from ".";
import { useSwapStore } from "@/stores/swapStore";

export const ManualRedeemAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { destinationNetwork, hashlock, sourceDetails, destRedeemTxId, error } = useActiveSwap();
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { claim } = useManualClaim();

    const { provider } = useWallet(destinationNetwork, 'withdrawal');
    const wallet = provider?.activeWallet;

    const handleManualClaim = async () => {
        try {
            if (!activeHashlock) throw new Error("No hashlock");
            if (!sourceDetails?.secret) throw new Error("Secret not available");
            if (!destinationNetwork) throw new Error("No destination network");

            if (provider?.activeWallet && (provider.activeWallet.chainId != destinationNetwork.chainId) && provider.switchChain)
                await provider.switchChain(provider.activeWallet, destinationNetwork.chainId);

            await claim({ hashlock: activeHashlock, secret: sourceDetails.secret.toString() });

            posthog.capture("ManualClaim", {
                hashlock,
                destinationNetwork: destinationNetwork.caip2Id,
            });
        } catch (e: any) {
            console.error('[ManualClaim] failed', e);
        }
    };

    if (!destinationNetwork || destRedeemTxId) return <></>;

    return (
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <WalletActionButton
                activeChain={wallet?.chainId}
                isConnected={!!wallet}
                network={destinationNetwork}
                networkChainId={destinationNetwork.chainId}
                onClick={handleManualClaim}
                type={type}
            >
                {error ? 'Try again' : 'Claim Assets'}
            </WalletActionButton>
        </div>
    );
};
