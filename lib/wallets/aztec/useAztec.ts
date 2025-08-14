import KnownInternalNames from "../../knownIds";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { useSettingsState } from "../../../context/settings";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useMemo } from "react";
import { Commit } from "../../../Models/phtlc/PHTLC";
import { useAccount } from "../../@nemi-fi/wallet-sdk/src/exports/react";
import { sdk } from "./configs";
import { addLockTransactionBuilder, claimTransactionBuilder, commitTransactionBuilder, refundTransactionBuilder } from "./transactionBuilder";
import { getAztecSecret } from "./secretUtils";
import { AztecAddress } from "@aztec/aztec.js";
import { TrainContractArtifact } from "./Train";
import { combineHighLow, highLowToHexString } from "./utils";
import { Contract } from "../../@nemi-fi/wallet-sdk/src/exports/eip1193"
import formatAmount from "../../formatAmount";

export default function useAztec(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.AztecTestnet,
        // KnownInternalNames.Networks.StarkNetMainnet,
    ]

    const { networks } = useSettingsState()

    const name = 'Aztec'
    const id = 'aztec'

    const account = useAccount(sdk)

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
            autofillSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
        }
    }, [account])

    const connectWallet = async ({ connector: internalConnector }: { connector: InternalConnector }) => {

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
                    autofillSupportedNetworks: commonSupportedNetworks,
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

        const tx = await commitTransactionBuilder({
            senderWallet: account,
            ...params
        })

        return { hash: tx.hash, commitId: tx.commitId }
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        let { id, contractAddress } = params;
        // contractAddress = '0x07f2f253b6f221be99da24de16651f9481df4e31d67420a1f8a86d2b444e8107'
        if (!account) throw new Error("No account connected");
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const atomicContract = await Contract.at(
            aztecAtomicContract,
            TrainContractArtifact,
            account,
        );

        const commitRaw: any = await atomicContract.methods
            .get_htlc_public(id)
            .simulate();

        const commit: Commit = {
            amount: formatAmount(Number(commitRaw.amount), 18),
            claimed: Number(commitRaw.claimed),
            timelock: Number(commitRaw.timelock),
            srcReceiver: commitRaw.src_receiver,
            hashlock: highLowToHexString({ high: commitRaw.hashlock_high, low: commitRaw.hashlock_low }),
            secret: combineHighLow({ high: commitRaw.secret_high, low: commitRaw.secret_low }),
            ownership: highLowToHexString({ high: commitRaw.ownership_high, low: commitRaw.ownership_low })
        }

        return commit

    }

    const addLock = async (params: CommitmentParams & LockParams) => {
        if (!account) throw new Error("No account connected");

        const tx = await addLockTransactionBuilder({
            senderWallet: account,
            ...params
        })

        return { hash: tx.lockCommit, result: tx.lockId }
    }

    const refund = async (params: RefundParams) => {
        if (!account) throw new Error("No account connected");

        const refundTx = await refundTransactionBuilder({
            senderWallet: account,
            ...params
        })

        return refundTx;
    }

    const claim = async (params: ClaimParams) => {
        if (!account) throw new Error("No account connected");

        // Get the stored Aztec secret for this swap
        const aztecSecret = await getAztecSecret(params.id);
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
        autofillSupportedNetworks: commonSupportedNetworks,
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