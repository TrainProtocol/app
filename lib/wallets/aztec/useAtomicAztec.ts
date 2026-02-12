import { AztecAddress } from "@aztec/aztec.js/addresses"
import { Fr } from "@aztec/aztec.js/fields"
import { AztecNode, createAztecNodeClient } from "@aztec/aztec.js/node"
import { CreatePreHTLCParams, LockParams, OldLockParams, RefundParams, ClaimParams } from "../../../Models/phtlc"
import { LockDetails } from "../../../Models/phtlc/PHTLC"
import { getAztecSecret } from "./secretUtils"
import { combineHighLow, highLowToHexValidated, trimTo30Bytes } from "./utils"
import formatAmount from "../../formatAmount"
import { TrainContract } from "./Train"
import { useSecretDerivation } from "@/context/secretDerivationContext"
import { secretToHashlock } from "@/lib/htlc/secretDerivation"
import { calculateEpochTimelock } from "../utils/calculateTimelock"
import { BaseAtomicFunctions } from "../utils/atomicTypes"

export interface UseAtomicAztecParams {
    wallet: any
    accountAddress: string | undefined | null
    aztecNodeUrl: string
}

export default function useAtomicAztec(params: UseAtomicAztecParams): BaseAtomicFunctions {
    const { wallet, accountAddress, aztecNodeUrl } = params
    const { deriveSecret } = useSecretDerivation()

    const createHTLC = async (params: CreatePreHTLCParams) => {
        if (!wallet) throw new Error("No wallet connected");
        
        // Secret derivation for HTLC with hashlock
        const chainId = params.chainId || 'aztec-mainnet';
        const timelock = calculateEpochTimelock(40);
        const secret = await deriveSecret({
            chainId,
            wallet: { metadata: { wallet }, providerName: 'aztec' } as any
        });
        // const hashlock = secretToHashlock(secret);

        const { commitTransactionBuilder } = await import('./transactionBuilder.ts')

        // Note: Add hashlock to transaction params when contract supports it
        const tx = await commitTransactionBuilder({
            senderWallet: wallet,
            aztecNodeUrl,
            ...params
        })

        return { hash: tx.hash, hashlock: tx.hashlock }
    }

    const getDetails = async (params: LockParams): Promise<LockDetails> => {
        let { id, contractAddress } = params;
        const id30Bytes = trimTo30Bytes(id);

        if (!wallet || !accountAddress) throw new Error("No wallet connected");

        const aztecAtomicContract = AztecAddress.fromString(contractAddress);

        const node: AztecNode = createAztecNodeClient(aztecNodeUrl);
        const trainInstance = await node.getContract(aztecAtomicContract);

        if (!trainInstance) {
            throw new Error("Train contract not found");
        }

        await wallet.registerContract(trainInstance, TrainContract.artifact);

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

        const commit: LockDetails = {
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

    const addLock = async (params: LockParams & OldLockParams) => {
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

    return {
        createHTLC,
        getDetails,
        getSolverLockDetails: getDetails,
        refund,
        claim
    }
}
