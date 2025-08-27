import KnownInternalNames from "../../knownIds";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { useSettingsState } from "../../../context/settings";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useMemo } from "react";
import { Commit } from "../../../Models/phtlc/PHTLC";
import { getAztecSecret } from "./secretUtils";
import { combineHighLow, highLowToHexValidated, trimTo30Bytes } from "./utils";
import formatAmount from "../../formatAmount";
import { sdk } from "./configs";
import { useAccount } from "../../@nemi-fi/wallet-sdk/src/exports/react";
export default function useAztec(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.AztecTestnet,
    ]

    const { networks } = useSettingsState()

    const name = 'Aztec'
    const id = 'aztec'

    const account = useAccount(sdk);

    const aztecWallet = useMemo(() => {
        if (!sdk || !account) return undefined;

        return {
            id: 'Azguard',
            displayName: 'Azguard - Aztec',
            addresses: [account.address.toString()],
            address: account.address.toString(),
            providerName: id,
            isActive: true,
            icon: resolveWalletConnectorIcon({ connector: name, address: account.address.toString(), iconUrl: "" }),
            disconnect: () => disconnectWallets(),
            withdrawalSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
        }
    }, [account, sdk])

    const connectWallet = async ({ connector: internalConnector }: { connector: InternalConnector }) => {
        if (!sdk) {
            throw new Error("Aztec SDK is not ready");
        }

        try {
            await sdk.connect(internalConnector.id);

            const account = sdk.getAccount();
            const connectedAddress = account?.address.toString();
            const wallet_id = 'Azguard';
            if (connectedAddress) {
                const newWallet: Wallet = {
                    id: wallet_id,
                    displayName: `${wallet_id} - Aztec`,
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    providerName: id,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: name, address: connectedAddress, iconUrl: availableWalletsForConnect.find(c => c.id === internalConnector.id)?.icon }),
                    disconnect: () => disconnectWallets(),
                    withdrawalSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                }

                return newWallet;
            }
        } catch (error) {
            console.error(`Error connecting ${internalConnector.name}:`, error);
            throw error;
        }

    }

    const disconnectWallets = async () => {
        try {
            if (!sdk) {
                throw new Error("Aztec wallet connect sdk is not initialized");
            }
            await sdk.disconnect();
        } catch (error) {
            console.error("Error disconnecting Azguard:", error);
            throw error;
        }
    }

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        if (!account) throw new Error("No account connected");
        const { commitTransactionBuilder } = await import('./transactionBuilder.ts')

        const tx = await commitTransactionBuilder({
            senderWallet: account,
            ...params
        })

        return { hash: tx.hash, commitId: tx.commitId }
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        let { id, contractAddress } = params;
        const id30Bytes = trimTo30Bytes(id);
        if (!account) throw new Error("No account connected");
        const { AztecAddress } = await import("@aztec/aztec.js");
        const { Contract } = await import('../../@nemi-fi/wallet-sdk/src/exports/eip1193.ts')
        const { TrainContractArtifact } = await import('./Train.ts')
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const atomicContract = await Contract.at(
            aztecAtomicContract,
            TrainContractArtifact,
            account,
        );

        const commitRaw: any = await atomicContract.methods
            .get_htlc_public(id30Bytes)
            .simulate();

        const hashlock = highLowToHexValidated(commitRaw.hashlock_high, commitRaw.hashlock_low);
        if (!Number(commitRaw.timelock)) {
            throw new Error("No result")
        }

        const commit: Commit = {
            amount: formatAmount(Number(commitRaw.amount), 8),
            claimed: Number(commitRaw.claimed),
            timelock: Number(commitRaw.timelock),
            // srcReceiver: commitRaw.src_receiver,
            hashlock: (hashlock == "0x00000000000000000000000000000000" || hashlock == '0x0000000000000000000000000000000000000000000000000000000000000000') ? undefined : hashlock,
            secret: combineHighLow({ high: commitRaw.secret_high, low: commitRaw.secret_low }),
            ownership: commitRaw.ownership_high ? highLowToHexValidated(commitRaw.ownership_high, commitRaw.ownership_low) : undefined
        }

        return commit

    }

    const addLock = async (params: CommitmentParams & LockParams) => {
        if (!account) throw new Error("No account connected");

        const { addLockTransactionBuilder } = await import('./transactionBuilder.ts')

        const tx = await addLockTransactionBuilder({
            senderWallet: account,
            ...params
        })

        return { hash: tx.lockCommit, result: tx.lockId }
    }

    const refund = async (params: RefundParams) => {
        if (!account) throw new Error("No account connected");

        const { refundTransactionBuilder } = await import('./transactionBuilder.ts')

        const refundTx = await refundTransactionBuilder({
            senderWallet: account,
            ...params
        })

        return refundTx;
    }

    const claim = async (params: ClaimParams) => {
        if (!account) throw new Error("No account connected");
        const { claimTransactionBuilder } = await import('./transactionBuilder.ts')

        // Get the stored Aztec secret for this swap
        const aztecSecret = params.destinationAddress && await getAztecSecret(params.destinationAddress);
        if (!aztecSecret) {
            throw new Error("No Aztec secret found for this swap");
        }

        const claimTx = await claimTransactionBuilder({
            senderWallet: account,
            ownershipKey: aztecSecret.secret,
            ...params
        })

        return claimTx;
    }

    const availableWalletsForConnect: InternalConnector[] = useMemo(() => {
        if (!sdk) return [];
        return sdk.connectors.map(connector => ({
            id: connector.name.toLowerCase(),
            name: connector.name,
            icon: connector.icon,
        }))
    }, [sdk.connectors])

    const provider = {
        connectWallet,
        disconnectWallets,
        availableWalletsForConnect,
        activeAccountAddress: aztecWallet?.address,
        connectedWallets: aztecWallet ? [aztecWallet] : undefined,
        activeWallet: aztecWallet,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,

        createPreHTLC,
        getDetails,
        addLock,
        refund,
        claim
    }

    return provider
}