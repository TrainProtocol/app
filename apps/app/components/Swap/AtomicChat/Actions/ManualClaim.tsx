import { FC } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import useWallet from "@/apps/app/hooks/useWallet";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { SwapViewType } from ".";
import { useWalletClient } from "wagmi";
import { createHTLCClient } from "@/apps/app/lib/htlc/createHTLCClient";
import { useRpcConfigStore } from "@/apps/app/stores/rpcConfigStore";

export const ManualClaimAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const {
        destination_network,
        destination_asset,
        hashlock,
        sourceDetails,
        solverLockDetails,
        destAtomicContract,
        address,
        setError,
        setManualClaimTxId,
        destRedeemTx,
    } = useAtomicState();

    const { provider } = useWallet(destination_network, 'withdrawal');
    const wallet = provider?.activeWallet;
    const { data: walletClient } = useWalletClient();
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls);

    const handleManualClaim = async () => {
        try {
            if (!hashlock) throw new Error("No hashlock");
            if (!sourceDetails?.secret) throw new Error("Secret not available");
            if (!destination_network) throw new Error("No destination network");
            if (!destination_asset) throw new Error("No destination asset");
            if (!destAtomicContract) throw new Error("No destination contract");
            if (!address) throw new Error("No destination address");
            if (!walletClient) throw new Error("No wallet client");

            if (provider?.activeWallet && (provider.activeWallet.chainId != destination_network.chainId) && provider.switchChain)
                await provider.switchChain(provider.activeWallet, destination_network.chainId);

            const writeClient = createHTLCClient(destination_network, getEffectiveRpcUrls, walletClient);

            const txHash = await writeClient.claim({
                type: destination_asset.contractAddress ? 'erc20' : 'native',
                chainId: destination_network.chainId,
                contractAddress: destAtomicContract,
                id: hashlock,
                secret: sourceDetails.secret,
                sourceAsset: destination_asset,
                destLpAddress: solverLockDetails?.sender || '',
                destinationAddress: address,
                destinationAsset: destination_asset,
            });

            if (txHash) {
                setManualClaimTxId(txHash);
            }

            posthog.capture("ManualClaim", {
                hashlock,
                destinationNetwork: destination_network.caip2Id,
            });
        } catch (e: any) {
            setError({ message: e.details || e.message });
        }
    };

    if (!destination_network || destRedeemTx) return <></>;

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
