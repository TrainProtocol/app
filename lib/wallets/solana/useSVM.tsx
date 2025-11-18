import KnownInternalNames from "../../knownIds"
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon"
import { NetworkType } from "../../../Models/Network"
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider"
import { useMemo } from "react"
import { AnchorWallet, useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react"
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc"
import { TokenAnchorHtlc } from "./tokenAnchorHTLC"
import { AnchorProvider, Program, setProvider } from '@coral-xyz/anchor'
import { PublicKey } from "@solana/web3.js"
import { useSettingsState } from "../../../context/settings"
import { useCallback } from "react"
import { lockTransactionBuilder, phtlcTransactionBuilder } from "./transactionBuilder"
import LayerSwapApiClient from "../../trainApiClient"
import { NativeAnchorHtlc } from "./nativeAnchorHTLC"

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
        const { atomicContract, sourceAsset } = params
        const program = (anchorProvider && atomicContract) ? new Program(sourceAsset.contract ? TokenAnchorHtlc(atomicContract) : NativeAnchorHtlc(atomicContract), anchorProvider) : null;

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

    }, [connection, signTransaction, publicKey, network])

    const getDetails = async (params: CommitmentParams) => {
        const solanaAddress = '4hLwFR5JpxztsYMyy574mcWsfYc9sbfeAx5FKMYfw8vB'
        const { contractAddress, id, type } = params

        if (!solanaAddress) throw new Error("No LP address")

        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');

        const lpAnchorWallet = { publicKey: new PublicKey(solanaAddress) }
        const provider = new AnchorProvider(connection, lpAnchorWallet as AnchorWallet);
        const lpProgram = (provider && contractAddress) ? new Program(type === 'erc20' ? TokenAnchorHtlc(contractAddress) : NativeAnchorHtlc(contractAddress), provider) : null;

        if (!lpProgram) {
            throw new Error("Could not initiate a program")
        }

        let [htlc] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            lpProgram.programId
        );

        // Check if the HTLC account exists before calling getDetails
        const accountInfo = await connection.getAccountInfo(htlc);
        if (!accountInfo) {
            // Account doesn't exist yet, return null
            return null;
        }

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
            console.error('Error fetching HTLC details:', e)
            // If account exists but getDetails fails, return null instead of throwing
            // This allows the polling mechanism to retry later
            return null
        }
    }

    const addLock = async (params: CommitmentParams & LockParams) => {

        const { contractAddress } = params
        const program = (anchorProvider && contractAddress) ? new Program(TokenAnchorHtlc(contractAddress), anchorProvider) : null;

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
                },
                    params.id,
                    params.solver
                )

                return { hash: sigBase64, result: hexLockId }

            } else {
                return null
            }
        } catch (e) {
            throw new Error("Failed to add lock")
        }

    }

    const refund = async (params: RefundParams) => {
        const { id, sourceAsset, contractAddress } = params
        const program = (anchorProvider && contractAddress) ? new Program(sourceAsset.contract ? TokenAnchorHtlc(contractAddress) : NativeAnchorHtlc(contractAddress), anchorProvider) : null;

        if (!program || !sourceAsset?.contract || !publicKey) return null

        const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;

        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );

        if (sourceAsset.contract) {
            let [htlcTokenAccount, _] = idBuffer && PublicKey.findProgramAddressSync(
                [Buffer.from("htlc_token_account"), idBuffer],
                program.programId
            );

            const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), publicKey);
            const tokenContract = new PublicKey(sourceAsset.contract);

            return await program.methods.refund(Array.from(idBuffer), Number(htlcBump)).accountsPartial({
                userSigning: publicKey,
                htlc,
                htlcTokenAccount,
                sender: publicKey,
                tokenContract: tokenContract,
                senderTokenAccount: senderTokenAddress,
            }).rpc();
        } else {
            return await program.methods.refund(Array.from(idBuffer), Number(htlcBump)).accountsPartial({
                userSigning: publicKey,
                htlc,
                sender: publicKey,
            }).rpc();
        }
    }

    const claim = async (params: ClaimParams) => {
        const { sourceAsset, id, secret, contractAddress, destLpAddress } = params
        const program = (anchorProvider && contractAddress) ? new Program(sourceAsset.contract ? TokenAnchorHtlc(contractAddress) : NativeAnchorHtlc(contractAddress), anchorProvider) : null;

        const lpAddress = new PublicKey(destLpAddress);

        if (!program || !publicKey) return

        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');
        const secretBuffer = Buffer.from(secret.toString().replace('0x', ''), 'hex');

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );

        if (sourceAsset.contract) {
            const tokenContract = new PublicKey(sourceAsset.contract);

            let [htlcTokenAccount, _] = idBuffer && PublicKey.findProgramAddressSync(
                [Buffer.from("htlc_token_account"), idBuffer],
                program.programId
            );

            const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;
            const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contract), lpAddress);

            return await program.methods.redeem(idBuffer, secretBuffer, htlcBump).
                accountsPartial({
                    userSigning: publicKey,
                    htlc: htlc,
                    htlcTokenAccount: htlcTokenAccount,
                    sender: lpAddress,
                    tokenContract: tokenContract,
                    srcReceiverTokenAccount: senderTokenAddress,
                })
                .rpc();
        } 
        else {
            return await program.methods.redeem(idBuffer, secretBuffer, htlcBump).
                accountsPartial({
                    userSigning: publicKey,
                    htlc: htlc,
                    sender: publicKey,
                    srcReceiver: publicKey,
                })
                .rpc();
        }
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