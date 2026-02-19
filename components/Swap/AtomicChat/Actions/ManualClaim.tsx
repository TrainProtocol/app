import { FC } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import useWallet from "@/hooks/useWallet";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";

export const ManualClaimAction: FC<{ type: 'widget' | 'contained' }> = ({ type }) => {
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
        destRedeemTx
    } = useAtomicState();

    const { provider } = useWallet(destination_network, 'withdrawal');
    const wallet = provider?.activeWallet;

    const handleManualClaim = async () => {
        try {
            if (!hashlock) throw new Error("No hashlock");
            if (!sourceDetails?.secret) throw new Error("Secret not available");
            if (!destination_network) throw new Error("No destination network");
            if (!destination_asset) throw new Error("No destination asset");
            if (!destAtomicContract) throw new Error("No destination contract");
            if (!address) throw new Error("No destination address");

            const txHash = await provider?.claim({
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
                destinationNetwork: destination_network.slug,
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
