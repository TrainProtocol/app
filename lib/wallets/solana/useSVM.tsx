import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import { ContractType, ManagedAccountType, Network, NetworkType } from "../../../Models/Network"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useMemo } from "react"
import { AnchorWallet, useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc"
import { AnchorHtlc } from "./anchorHTLC"
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor'
import { PublicKey } from "@solana/web3.js"
import { useSettingsState } from "../../../context/settings"
import { useCallback } from "react"
import { lockTransactionBuilder, phtlcTransactionBuilder } from "./transactionBuilder"
import LayerSwapApiClient from "../../layerSwapApiClient"

const solanaNames = [KnownInternalNames.Networks.SolanaMainnet, KnownInternalNames.Networks.SolanaDevnet, KnownInternalNames.Networks.SolanaTestnet]

export default function useSVM(): WalletProvider {
    const { networks } = useSettingsState()
    const network = networks.find(n => solanaNames.some(name => n.name === name))
    const commonSupportedNetworks = [
        ...networks.filter(network => network.type === NetworkType.Solana).map(l => l.name)
    ]

    const name = 'Solana'
    const id = 'solana'
    const { disconnect, wallet: solanaWallet, select, wallets, signTransaction, signMessage } = useWallet();
    const publicKey = solanaWallet?.adapter.publicKey

    const connectedWallet = wallets.find(w => w.adapter.connected === true)
    const connectedAddress = connectedWallet?.adapter.publicKey?.toBase58()
    const connectedAdapterName = connectedWallet?.adapter.name

    const { connection } = useConnection();
    const anchorWallet = useAnchorWallet();

    const anchorProvider = anchorWallet && new AnchorProvider(connection, anchorWallet);
    if (anchorProvider) setProvider(anchorProvider);

    const htlc_token_account = network?.contracts.find(c => c.type === ContractType.HTLCTokenContractAddress)?.address
    const program = (anchorProvider && htlc_token_account) ? new Program(AnchorHtlc(htlc_token_account), anchorProvider) : null;

    const connectedWallets = useMemo(() => {

        const wallet: Wallet | undefined = (connectedAddress && connectedAdapterName) ? {
            id: connectedAdapterName,
            address: connectedAddress,
            displayName: `${connectedWallet?.adapter.name} - Solana`,
            providerName: name,
            icon: resolveWalletConnectorIcon({ connector: String(connectedAdapterName), address: connectedAddress, iconUrl: connectedWallet?.adapter.icon }),
            disconnect,
            isActive: true,
            addresses: [connectedAddress],
            asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
            autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
            withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connectedAdapterName),
            networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
        } : undefined

        if (wallet) {
            return [wallet]
        }

    }, [connectedAddress, connectedAdapterName])


    const connectWallet = async ({ connector }: { connector: InternalConnector }) => {
        const solanaConnector = wallets.find(w => w.adapter.name.includes(connector.name))
        if (!solanaConnector) throw new Error('Connector not found')
        if (connectedWallet) await solanaConnector.adapter.disconnect()
        select(solanaConnector.adapter.name)
        await solanaConnector.adapter.connect()

        const newConnectedWallet = wallets.find(w => w.adapter.connected === true)
        const connectedAddress = newConnectedWallet?.adapter.publicKey?.toBase58()
        const wallet: Wallet | undefined = connectedAddress && newConnectedWallet ? {
            id: newConnectedWallet.adapter.name,
            address: connectedAddress,
            displayName: `${newConnectedWallet?.adapter.name} - Solana`,
            providerName: name,
            icon: resolveWalletConnectorIcon({ connector: String(newConnectedWallet?.adapter.name), address: connectedAddress, iconUrl: newConnectedWallet?.adapter.icon }),
            disconnect,
            isActive: true,
            addresses: [connectedAddress],
            asSourceSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
            autofillSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
            withdrawalSupportedNetworks: resolveSupportedNetworks(commonSupportedNetworks, connector.id),
            networkIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo
        } : undefined

        return wallet
    }

    const disconnectWallet = async () => {
        try {
            await disconnect()
        }
        catch (e) {
            console.log(e)
        }
    }

    const availableWalletsForConnect = useMemo(() => {
        const connectors: InternalConnector[] = [];

        for (const wallet of wallets) {

            const internalConnector: InternalConnector = {
                name: wallet.adapter.name.trim(),
                id: wallet.adapter.name.trim(),
                icon: wallet.adapter.icon,
                type: wallet.readyState === 'Installed' ? 'injected' : 'other',
                installUrl: (wallet.readyState === 'Installed' || wallet.readyState === 'Loadable') ? undefined : wallet.adapter?.url,
            }

            connectors.push(internalConnector)
        }

        return connectors;
    }, [wallets]);

    const createPreHTLC = useCallback(async (params: CreatePreHTLCParams): Promise<{ hash: string; commitId: string; } | null | undefined> => {
        if (!program || !publicKey || !network) return null

        const transaction = await phtlcTransactionBuilder({ connection, program, walletPublicKey: publicKey, network, ...params })

        const signed = transaction?.initAndCommit && signTransaction && await signTransaction(transaction.initAndCommit);
        const signature = signed && await connection.sendRawTransaction(signed.serialize());

        if (signature) {
            const blockHash = await connection.getLatestBlockhash();

            const res = await connection.confirmTransaction({
                blockhash: blockHash.blockhash,
                lastValidBlockHeight: blockHash.lastValidBlockHeight,
                signature
            });

            if (res?.value.err) {
                throw new Error(res.value.err.toString())
            }

            return { hash: signature, commitId: `0x${toHexString(transaction.commitId)}` }
        }

    }, [program, connection, signTransaction, publicKey, network])

    const getDetails = async (params: CommitmentParams) => {

        const lpAddress = network?.managedAccounts.find(c => c.type === ManagedAccountType.Primary)?.address

        if (!lpAddress) throw new Error("No LP address")

        const { id } = params
        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');

        const lpAnchorWallet = { publicKey: new PublicKey(lpAddress) }
        const provider = new AnchorProvider(connection, lpAnchorWallet as AnchorWallet);
        const lpProgram = (provider && htlc_token_account) ? new Program(AnchorHtlc(htlc_token_account), provider) : null;

        if (!lpProgram) {
            throw new Error("Could not initiate a program")
        }

        let [htlc] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            lpProgram.programId
        );

        try {
            const result = await lpProgram?.methods.getDetails(Array.from(idBuffer)).accountsPartial({ htlc }).view();

            if (!result) return null

            const parsedResult = {
                ...result,
                hashlock: (result?.hashlock && toHexString(result.hashlock) !== '0000000000000000000000000000000000000000000000000000000000000000') && `0x${toHexString(result.hashlock)}`,
                amount: Number(result.amount) / Math.pow(10, 6),
                timelock: Number(result.timelock),
                sender: new PublicKey(result.sender).toString(),
                srcReceiver: new PublicKey(result.srcReceiver).toString(),
                secret: result.secret,
                tokenContract: new PublicKey(result.tokenContract).toString(),
                tokenWallet: new PublicKey(result.tokenWallet).toString(),
            }

            return parsedResult
        }
        catch (e) {
            console.log(e)
            throw new Error("No result")
        }
    }

    const addLock = async (params: CommitmentParams & LockParams) => {

        if (!program || !publicKey) return null

        const { lockCommit, lockId, timelock } = await lockTransactionBuilder({ program, walletPublicKey: publicKey, ...params })

        const hexLockId = `0x${toHexString(lockId)}`

        if (!signMessage) {
            throw new Error("Wallet does not support message signing!");
        }

        try {

            const signature = await signMessage(lockCommit)

            if (signature) {
                const sigBase64 = Buffer.from(signature).toString("base64");
                const apiClient = new LayerSwapApiClient()

                await apiClient.AddLockSig({
                    signature: sigBase64,
                    timelock: timelock,
                }, params.id)

                return { hash: sigBase64, result: hexLockId }

            } else {
                return null
            }
        } catch (e) {
            throw new Error("Failed to add lock")
        }

    }

    const refund = async (params: RefundParams) => {
        const { id, sourceAsset } = params

        if (!program || !sourceAsset?.contract || !publicKey) return null

        const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;
        const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), publicKey);
        const tokenContract = new PublicKey(sourceAsset.contract);

        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );
        let [htlcTokenAccount, bump3] = idBuffer && PublicKey.findProgramAddressSync(
            [Buffer.from("htlc_token_account"), idBuffer],
            program.programId
        );

        const result = await program.methods.refund(Array.from(idBuffer), Number(htlcBump)).accountsPartial({
            userSigning: publicKey,
            htlc,
            htlcTokenAccount,
            sender: publicKey,
            tokenContract: tokenContract,
            senderTokenAccount: senderTokenAddress,
        }).rpc();

        return result
    }

    const claim = async (params: ClaimParams) => {
        const { sourceAsset, id, secret } = params

        if (!program || !sourceAsset?.contract || !publicKey) return

        const tokenContract = new PublicKey(sourceAsset.contract);
        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');
        const secretBuffer = Buffer.from(secret.toString().replace('0x', ''), 'hex');
        const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;
        const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), publicKey);

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );
        let [htlcTokenAccount, bump3] = idBuffer && PublicKey.findProgramAddressSync(
            [Buffer.from("htlc_token_account"), idBuffer],
            program.programId
        );

        const hash = await program.methods.redeem(idBuffer, secretBuffer, htlcBump).
            accountsPartial({
                userSigning: publicKey,
                htlc: htlc,
                htlcTokenAccount: htlcTokenAccount,
                sender: publicKey,
                tokenContract: tokenContract,
                srcReceiverTokenAccount: senderTokenAddress,
            })
            .rpc();

        return hash
    }

    const provider = {
        connectedWallets: connectedWallets,
        activeWallet: connectedWallets?.[0],
        connectWallet,
        disconnectWallets: disconnectWallet,
        isNotAvailableCondition: isNotAvailable,
        availableWalletsForConnect,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        providerIcon: networks.find(n => solanaNames.some(name => name === n.name))?.logo,

        createPreHTLC,
        getDetails,
        addLock,
        refund,
        claim,
    }

    return provider
}


function toHexString(byteArray) {
    return Array.from(byteArray, function (byte: any) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

const isNotAvailable = (connector: string | undefined, network: string | undefined) => {
    if (!network) return false
    if (!connector) return true
    return resolveSupportedNetworks([network], connector).length === 0
}

const networkSupport = {
    soon: ["okx wallet", "tokenpocket", "nightly"],
    eclipse: ["nightly", "backpack"],
};

function resolveSupportedNetworks(supportedNetworks: string[], connectorId: string): string[] {
    const supportedNetworksForWallet: string[] = [];

    supportedNetworks.forEach((network) => {
        const networkName = network.split("_")[0].toLowerCase();
        if (networkName === "solana") {
            supportedNetworksForWallet.push(networkName);
        } else if (networkSupport[networkName] && networkSupport[networkName].includes(connectorId?.toLowerCase())) {
            supportedNetworksForWallet.push(networkName);
        }
    });

    return supportedNetworksForWallet;
}