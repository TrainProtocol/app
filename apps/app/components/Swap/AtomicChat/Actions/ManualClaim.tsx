import { FC } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import { useManualClaim, useClearSwapError } from "@train-protocol/react";
import useWallet from "@/hooks/useWallet";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { SwapViewType } from ".";
import { useSwapStore } from "@/stores/swapStore";

export const ManualRedeemAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { destinationNetwork, hashlock, destRedeemTxId, error } = useActiveSwap();
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { claim } = useManualClaim();
    const clearError = useClearSwapError(activeHashlock);

    const { provider } = useWallet(destinationNetwork, 'withdrawal');
    const wallet = provider?.activeWallet;

    const handleManualClaim = async () => {
        clearError();
        try {
            if (!activeHashlock) throw new Error("No hashlock");
            if (!destinationNetwork) throw new Error("No destination network");

            if (provider?.activeWallet && (provider.activeWallet.chainId != destinationNetwork.chainId) && provider.switchChain)
                await provider.switchChain(provider.activeWallet, destinationNetwork.chainId);

            // Secret is resolved inside the hook: on-chain source lock if the solver
            // already redeemed it, otherwise re-derived from the logged-in identity.
            await claim({ hashlock: activeHashlock });

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
