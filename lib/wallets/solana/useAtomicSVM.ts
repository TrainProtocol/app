import { AnchorProvider, Program } from "@coral-xyz/anchor"
import { Connection, PublicKey } from "@solana/web3.js"
import { Network } from "../../../Models/Network"
import { CreatePreHTLCParams, CommitmentParams, LockParams, RefundParams, ClaimParams } from "../../../Models/phtlc"
import { TokenAnchorHtlc } from "./tokenAnchorHTLC"
import { NativeAnchorHtlc } from "./nativeAnchorHTLC"
import { lockTransactionBuilder, phtlcTransactionBuilder } from "./transactionBuilder"
import LayerSwapApiClient from "../../trainApiClient"
import { toHex } from "viem"
import { AnchorWallet } from "@solana/wallet-adapter-react"
import { useSecretDerivation } from "@/context/secretDerivationContext"
import { secretToHashlock } from "@/lib/htlc/secretDerivation"
import { calculateEpochTimelock } from "../utils/calculateTimelock"
import { toHexString } from "../utils/atomicHelpers"

export interface UseAtomicSVMParams {
    connection: Connection
    signTransaction: ((transaction: any) => Promise<any>) | undefined
    signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | undefined
    publicKey: PublicKey | null
    network: Network | undefined
    anchorProvider: AnchorProvider | undefined
}

export default function useAtomicSVM(params: UseAtomicSVMParams) {
    const { connection, signTransaction, signMessage, publicKey, network, anchorProvider } = params
    const { deriveSecret } = useSecretDerivation()

    const createPreHTLC = async (params: CreatePreHTLCParams): Promise<{ hash: string; commitId: string; } | null | undefined> => {
        const { atomicContract, sourceAsset } = params
        const program = (anchorProvider && atomicContract) ? new Program(sourceAsset.contractAddress ? TokenAnchorHtlc(atomicContract) : NativeAnchorHtlc(atomicContract), anchorProvider) : null;

        if (!program || !publicKey || !network) return null

        // Secret derivation for HTLC with hashlock
        const chainId = network.chainId || 'solana-mainnet';
        const timelock = calculateEpochTimelock(40);
        const solanaWallet = { signMessage };
        const secret = await deriveSecret({
            chainId,
            wallet: { metadata: { wallet: solanaWallet }, providerName: 'solana' } as any
        });
        // const hashlock = secretToHashlock(secret);

        // Note: Add hashlock to transaction params when contract supports it
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

    }

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

        let [htlc, _] = idBuffer && PublicKey.findProgramAddressSync(
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
                tokenContract: result.tokenContract ? new PublicKey(result.tokenContract).toString() : undefined,
                tokenWallet: result.tokenWallet ? new PublicKey(result.tokenWallet).toString() : undefined,
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
        const program = (anchorProvider && contractAddress) ? new Program(sourceAsset.contractAddress ? TokenAnchorHtlc(contractAddress) : NativeAnchorHtlc(contractAddress), anchorProvider) : null;

        if (!program || !sourceAsset?.contractAddress || !publicKey) return null

        const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;

        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );

        if (sourceAsset.contractAddress) {
            let [htlcTokenAccount, _] = idBuffer && PublicKey.findProgramAddressSync(
                [Buffer.from("htlc_token_account"), idBuffer],
                program.programId
            );

            const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contractAddress), publicKey);
            const tokenContract = new PublicKey(sourceAsset.contractAddress);

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
        const program = (anchorProvider && contractAddress) ? new Program(sourceAsset.contractAddress ? TokenAnchorHtlc(contractAddress) : NativeAnchorHtlc(contractAddress), anchorProvider) : null;

        const lpAddress = new PublicKey(destLpAddress);

        if (!program || !publicKey) return

        const idBuffer = Buffer.from(id.replace('0x', ''), 'hex');
        const secretBuffer = Buffer.from(toHex(secret).toString().replace('0x', ''), 'hex');

        let [htlc, htlcBump] = idBuffer && PublicKey.findProgramAddressSync(
            [idBuffer],
            program.programId
        );

        if (sourceAsset.contractAddress) {
            const tokenContract = new PublicKey(sourceAsset.contractAddress);

            let [htlcTokenAccount, _] = idBuffer && PublicKey.findProgramAddressSync(
                [Buffer.from("htlc_token_account"), idBuffer],
                program.programId
            );

            const getAssociatedTokenAddress = (await import('@solana/spl-token')).getAssociatedTokenAddress;
            const senderTokenAddress = await getAssociatedTokenAddress(new PublicKey(sourceAsset.contractAddress), lpAddress);

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
            return await program.methods.redeem(idBuffer, secretBuffer).
                accountsPartial({
                    userSigning: publicKey,
                    htlc: htlc,
                    sender: lpAddress,
                    srcReceiver: publicKey,
                })
                .rpc();
        }
    }

    return {
        createHTLC: createPreHTLC,
        getDetails,
        addLock,
        refund,
        claim
    }
}
