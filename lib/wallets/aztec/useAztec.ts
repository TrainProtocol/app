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
import { TrainContract } from "./Train";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { useAztecNodeUrl } from "./configs";
import { useAztecWalletContext } from "./AztecWalletProvider";

export default function useAztec(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.AztecTestnet,
    ]

    const { networks } = useSettingsState()

    const aztecNodeUrl = useAztecNodeUrl();

    const name = 'Aztec'
    const id = 'aztec'

    const { wallet, connected, accountAddress, connect, disconnect, isInstalled } = useAztecWalletContext();

    const aztecWallet = useMemo(() => {
        if (!wallet || !connected || !accountAddress) return undefined;

        return {
            id: 'Azguard',
            displayName: 'Azguard - Aztec',
            addresses: [accountAddress],
            address: accountAddress,
            providerName: id,
            isActive: true,
            icon: resolveWalletConnectorIcon({ connector: name, address: accountAddress, iconUrl: AzguardIconBase64 }),
            disconnect: () => disconnectWallets(),
            withdrawalSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
        }
    }, [wallet, connected, accountAddress, networks])

    const connectWallet = async ({ connector: internalConnector }: { connector: InternalConnector }) => {
        try {
            // AzguardWallet.connect() handles the connection UI
            // The connector parameter is not used since AzguardWallet is a single wallet
            const wallet = await connect();

            const accounts = await wallet.getAccounts();
            const connectedAddress = accounts[0]?.item.toString();
            const wallet_id = 'Azguard';

            if (connectedAddress) {
                const newWallet: Wallet = {
                    id: wallet_id,
                    displayName: `${wallet_id} - Aztec`,
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    providerName: id,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: name, address: connectedAddress, iconUrl: AzguardIconBase64 }),
                    disconnect: () => disconnectWallets(),
                    withdrawalSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.name))?.logo
                }

                return newWallet;
            }
        } catch (error) {
            console.error(`Error connecting Azguard:`, error);
            throw error;
        }
    }

    const disconnectWallets = async () => {
        await disconnect();
    }

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        if (!wallet) throw new Error("No wallet connected");
        const { commitTransactionBuilder } = await import('./transactionBuilder.ts')

        const tx = await commitTransactionBuilder({
            senderWallet: wallet,
            aztecNodeUrl,
            ...params
        })

        return { hash: tx.hash, commitId: tx.commitId }
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        let { id, contractAddress } = params;
        const id30Bytes = trimTo30Bytes(id);

        if (!wallet || !accountAddress) throw new Error("No wallet connected");

        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const atomicContract = await TrainContract.at(
            aztecAtomicContract,
            wallet,
        );

        const userAztecAddress = AztecAddress.fromString(accountAddress);

        const commitRaw: any = await atomicContract.methods
            .get_htlc_public(Fr.fromString(id30Bytes))
            .simulate({ from: userAztecAddress });

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
        if (!wallet) throw new Error("No wallet connected");

        const { addLockTransactionBuilder } = await import('./transactionBuilder.ts')

        const tx = await addLockTransactionBuilder({
            senderWallet: wallet,
            ...params
        })

        return { hash: tx.lockCommit, result: tx.lockId }
    }

    const refund = async (params: RefundParams) => {
        if (!wallet) throw new Error("No wallet connected");

        const { refundTransactionBuilder } = await import('./transactionBuilder.ts')

        const refundTx = await refundTransactionBuilder({
            senderWallet: wallet,
            ...params
        })

        return refundTx;
    }

    const claim = async (params: ClaimParams) => {
        if (!wallet) throw new Error("No wallet connected");
        const { claimTransactionBuilder } = await import('./transactionBuilder.ts')

        // Get the stored Aztec secret for this swap
        const aztecSecret = params.destinationAddress && getAztecSecret(params.destinationAddress);
        if (!aztecSecret) {
            throw new Error("No Aztec secret found for this swap");
        }

        const claimTx = await claimTransactionBuilder({
            senderWallet: wallet,
            ownershipKey: aztecSecret.secret,
            aztecNodeUrl,
            ...params
        })

        return claimTx;
    }

    // AzguardWallet is a single wallet, so we provide a single connector option
    const availableWalletsForConnect: InternalConnector[] = useMemo(() => {
        return [{
            id: 'azguard',
            name: 'Azguard',
            icon: AzguardIconBase64,
            installUrl: !isInstalled ? "https://chromewebstore.google.com/detail/azguard-wallet/pliilpflcmabdiapdeihifihkbdfnbmn" : undefined
        }]
    }, [isInstalled])

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


const AzguardIconBase64 = 'data:image/png;base64,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'