import KnownInternalNames from "../../knownIds";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { useSettingsState } from "../../../context/settings";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useMemo } from "react";
import { Commit } from "../../../Models/phtlc/PHTLC";
import { useAccount } from "../../@nemi-fi/wallet-sdk/src/exports/react";
import { sdk } from "./configs";
import { addLockTransactionBuilder, aztecContractInstance, commitTransactionBuilder } from "./transactionBuilder";

export default function useAztec(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.AztecTestnet,
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
        const { id, contractAddress } = params;

        if (!account) throw new Error("No account connected");

        const atomicContract = await aztecContractInstance(
            contractAddress,
            account,
            id,
        );

        const commitRaw = await atomicContract.methods
            .get_htlc_public(id)
            .simulate();

        const commit: any = {

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
        const { id, contractAddress } = params;

        if (!account) throw new Error("No account connected");
        if (!contractAddress) throw new Error("Missing required parameters");

        const atomicContract = await aztecContractInstance(
            contractAddress,
            account,
            id,
        );

        const refundTx = await atomicContract.methods
            .refund_private(id)
            .send()
            .wait({ timeout: 120000 });

        return refundTx.txHash.toString();
    }

    const claim = async (params: ClaimParams) => {

        const { id, contractAddress, secret } = params;

        if (!account) throw new Error("No account connected");
        if (!contractAddress) throw new Error("Missing required parameters");

        const atomicContract = await aztecContractInstance(
            contractAddress,
            account,
            id,
        );

        const ownershipKey = ""

        const claimTx = await atomicContract.methods
            .redeem_private(id, secret, ownershipKey)
            .send()
            .wait({ timeout: 120000 });

        return claimTx.txHash.toString();

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