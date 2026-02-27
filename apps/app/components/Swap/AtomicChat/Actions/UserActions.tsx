import { FC, useState } from "react";
import useWallet from "@/apps/app/hooks/useWallet";
import { useAtomicState } from "@/apps/app/context/atomicContext";
import { WalletActionButton } from "../../buttons";
import posthog from "posthog-js";
import { LockStatus } from "@/apps/app/Models/phtlc/PHTLC";
import { SwapQuote } from "@/apps/app/lib/trainApiClient";
import { useSwapStore } from "@/apps/app/stores/swapStore";
import { SwapViewType } from ".";
import { useConfig, useWalletClient } from "wagmi";
import { useSecretDerivation } from "@/apps/app/context/secretDerivationContext";
import { secretToHashlock } from "@train-protocol/sdk";
import { createHTLCClient } from "@/apps/app/lib/htlc/createHTLCClient";
import { useRpcConfigStore } from "@/apps/app/stores/rpcConfigStore";
import { useSelectedAccount } from "@/context/swapAccounts";
import { Address } from "@/lib/address";

type UserCommitActionProps = {
    quote?: SwapQuote
    type: SwapViewType
}

export const UserCommitAction: FC<UserCommitActionProps> = ({ quote, type }) => {
    const { source_network, destination_network, amount, address, source_asset, destination_asset, onUserLock, hashlock, setError, srcAtomicContract } = useAtomicState();
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const { data: walletClient } = useWalletClient()
    const { deriveSecret } = useSecretDerivation()
    const config = useConfig()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)
    const sourceAccount = useSelectedAccount('from', source_network?.caip2Id)
    const sourceWallet = (sourceAccount?.address && source_network) ? provider?.connectedWallets?.find(w => Address.equals(w.address, sourceAccount?.address, source_network)) : undefined

    const atomicContract = srcAtomicContract
    const destLpAddress = quote?.destinationSolverAddress
    const srcLpAddress = quote?.sourceSolverAddress

    const handleUserLock = async () => {
        try {
            if (!amount) {
                throw new Error("No amount specified")
            }
            if (!address) {
                throw new Error("Please enter a valid address")
            }
            if (!destination_network) {
                throw new Error("No destination chain")
            }
            if (!source_network) {
                throw new Error("No source chain")
            }
            if (!source_asset) {
                throw new Error("No source asset")
            }
            if (!destination_asset) {
                throw new Error("No destination asset")
            }
            if (!provider) {
                throw new Error("No source_provider")
            }
            if (!atomicContract) {
                throw new Error("No atomic contract")
            }
            if (!destLpAddress || !srcLpAddress) {
                throw new Error("No lp address")
            }
            if (!walletClient) {
                throw new Error("No wallet client")
            }

            if (provider && sourceWallet && (sourceWallet.chainId != source_network.chainId) && provider.switchChain) await provider.switchChain(sourceWallet, source_network.chainId)

            const { secret, nonce } = await deriveSecret({
                wallet: provider?.activeWallet,
                config
            })
            const htlcHashlock = secretToHashlock(secret)

            const writeClient = createHTLCClient(source_network, getEffectiveRpcUrls, walletClient)

            const result = await writeClient.createHTLC({
                address,
                amount: amount.toString(),
                destinationChain: destination_network.caip2Id,
                sourceChain: source_network.caip2Id,
                destinationAsset: destination_asset.contractAddress,
                sourceAsset: source_asset,
                destLpAddress,
                srcLpAddress,
                tokenContractAddress: source_asset.contractAddress,
                decimals: source_asset.decimals,
                atomicContract,
                chainId: source_network.chainId,
                solverData: quote?.signature,
                quoteExpiry: quote?.quoteExpirationTimestampInSeconds,
                rewardToken: quote?.reward ? quote?.reward.rewardToken : undefined,
                rewardRecipient: quote?.reward ? quote?.reward.rewardRecipientAddress : undefined,
                rewardAmount: quote?.reward ? quote?.reward.amount : undefined,
                rewardTimelockDelta: quote?.reward ? quote?.reward.rewardTimelockTimeSpanInSeconds : undefined,
                destinationAmount: quote?.receiveAmount,
                timelockDelta: quote?.timelock.timelockTimeSpanInSeconds,
                hashlock: htlcHashlock,
                nonce,
            })
            if (result?.hashlock && result?.hash) {
                onUserLock(
                    result.hashlock,
                    result.hash
                )

                posthog.capture("UserLock", {
                    hashlock: result.hashlock,
                    amount: amount,
                    sourceNetwork: source_network.caip2Id,
                    destinationNetwork: destination_network.caip2Id,
                    sourceAsset: source_asset.symbol,
                    destinationAsset: destination_asset.symbol,
                    userAddress: address,
                })
            }
        }
        catch (e) {
            setError({ message: e.details || e.message })
        }
    }

    if (!source_network) return <></>

    return hashlock ?
        <></>
        :
        <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
            <WalletActionButton
                activeChain={wallet?.chainId}
                isConnected={!!wallet}
                network={source_network}
                networkChainId={source_network.chainId}
                onClick={handleUserLock}
                type={type}
            >
                Confirm in wallet
            </WalletActionButton>
        </div>
}

export const UserRefundAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { source_network, hashlock, sourceDetails, source_asset, setError, refundTxId, srcAtomicContract } = useAtomicState()
    const { provider: source_provider } = useWallet(source_network, 'withdrawal')
    const { data: walletClient } = useWalletClient()
    const updateSwap = useSwapStore(s => s.updateSwap)
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const [requestedRefund, setRequestedRefund] = useState(false)

    const wallet = source_provider?.activeWallet

    const handleRefundAssets = async () => {
        try {
            if (!source_network) throw new Error("No source network")
            if (!hashlock) throw new Error("No commitment details")
            if (!sourceDetails) throw new Error("No commitment")
            if (!source_asset) throw new Error("No source asset")
            if (!srcAtomicContract) throw new Error("No atomic contract")
            if (!walletClient) throw new Error("No wallet client")

            if (source_provider?.activeWallet && (source_provider.activeWallet.chainId != source_network.chainId) && source_provider.switchChain)
                await source_provider.switchChain(source_provider.activeWallet, source_network.chainId)

            const writeClient = createHTLCClient(source_network, getEffectiveRpcUrls, walletClient)

            const res = await writeClient.refund({
                type: (source_asset?.contractAddress && source_asset.contractAddress !== '0x0000000000000000000000000000000000000000') ? 'erc20' : 'native',
                id: hashlock,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chainId,
                contractAddress: srcAtomicContract as `0x${string}`,
                sourceAsset: source_asset,
            })

            posthog.capture("Refund", {
                userLock: sourceDetails,
                hashlock: sourceDetails?.hashlock,
                chainId: source_network.chainId,
                contractAddress: srcAtomicContract
            })

            if (res) {
                updateSwap(hashlock, { refundTxId: res })
                setRequestedRefund(true)
            }
        }
        catch (e) {
            setError({ message: e.details || e.message })
        }
    }

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {
            ((requestedRefund || !!refundTxId) && sourceDetails?.status !== LockStatus.Refunded) ?
                null
                :
                <WalletActionButton
                    activeChain={wallet?.chainId}
                    isConnected={!!wallet}
                    network={source_network!}
                    networkChainId={Number(source_network?.chainId)}
                    onClick={handleRefundAssets}
                    type={type}
                >
                    Cancel & Refund
                </WalletActionButton>
        }
    </div>
}
