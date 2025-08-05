import {
    AztecAddress,
    encodeArguments,
    FunctionType,
} from '@aztec/aztec.js';
import {
    TokenContractArtifact,
} from "@aztec/noir-contracts.js/Token";
import { TrainContract } from "./Train";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { Account } from "../../@nemi-fi/wallet-sdk/src/exports";
import { Contract } from "../../@nemi-fi/wallet-sdk/src/exports/eip1193"
import { generateId, getFunctionAbi, getSelector } from './utils';
import { calculateEpochTimelock } from '../utils/calculateTimelock';

const TrainContractArtifact = TrainContract.artifact;

export const commitTransactionBuilder = async (props: CreatePreHTLCParams & { senderWallet: Account }) => {
    let { tokenContractAddress, lpAddress, atomicContract, sourceAsset, senderWallet, address, destinationChain, destinationAsset, amount } = props;

    atomicContract = '0x07f2f253b6f221be99da24de16651f9481df4e31d67420a1f8a86d2b444e8107';
    tokenContractAddress = '0x16083d0891f6d8d3fea6cca7faa8c72da7a88dab141fce18d4e917281c55c952';

    if (!tokenContractAddress || !lpAddress || !atomicContract || !sourceAsset || !senderWallet) throw new Error("Missing required parameters");

    const id = generateId();
    const timelock = calculateEpochTimelock(20);
    const parsedAmount = Math.pow(10, sourceAsset.decimals) * Number(amount);

    try {

        const contractAddress = AztecAddress.fromString(atomicContract);
        const tokenAddress = AztecAddress.fromString(tokenContractAddress);

        const aztecAtomicContract = AztecAddress.fromString(atomicContract);
        const contract = await Contract.at(
            aztecAtomicContract,
            TrainContractArtifact,
            senderWallet,
        );

        const is_contract_initialized = await contract.methods
            .is_contract_initialized(id)
            .simulate();

        if (is_contract_initialized) {
            throw new Error(`Contract with ID ${id} is already initialized.`);
        }

        const randomness = generateId();

        const commitArgs = [
            id,
            lpAddress,
            timelock,
            tokenContractAddress,
            parsedAmount,
            destinationChain,
            destinationAsset,
            address,
            randomness
        ]

        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "commit_private_user"), commitArgs)

        const asset = await Contract.at(
            tokenAddress,
            TokenContractArtifact,
            senderWallet,
        );
        const transfer = asset
            .withAccount(senderWallet)
            .methods.transfer_to_public(
                senderWallet.getAddress(),
                contractAddress,
                amount,
                randomness,
            );

        const tx = senderWallet.sendTransaction({
            calls: [
                {
                    to: contractAddress,
                    name: "commit_private_user",
                    args: encodedArguments,
                    selector: await getSelector("commit_private_user", TrainContractArtifact),
                    type: FunctionType.PRIVATE,
                    isStatic: false,
                    returnTypes: [],
                }
            ],
            registerContracts: [
                {
                    address: contractAddress,
                    account: senderWallet,
                    artifact: TrainContractArtifact,
                },
                {
                    address: tokenAddress,
                    account: senderWallet,
                    artifact: TokenContractArtifact,
                }
            ],
            authWitnesses: [{ caller: contractAddress, action: transfer }]
        })

        const commitTx = await tx?.wait({ timeout: 120000 });
        if (!commitTx) {
            throw new Error("Transaction failed or timed out");
        }

        return { hash: commitTx?.txHash.toString(), commitId: id.toString() };

    } catch (error) {
        console.error("Error building commit transaction:", error);
        throw error;
    }
}

export const addLockTransactionBuilder = async (params: CommitmentParams & LockParams & { senderWallet: Account }) => {

    const { id, senderWallet, contractAddress, hashlock } = params;

    const timelock = calculateEpochTimelock(20);

    if (!senderWallet || !contractAddress || !hashlock) {
        throw new Error("Missing required parameters");
    }

    const uint8ArrayHashlock = new TextEncoder().encode(hashlock);

    try {

        const aztecAtomicContract = AztecAddress.fromString(contractAddress);

        const commitArgs = [
            id,
            uint8ArrayHashlock,
            timelock,
        ]

        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "add_lock_private_user"), commitArgs)

        const tx = senderWallet.sendTransaction({
            calls: [
                {
                    to: aztecAtomicContract,
                    name: "add_lock_private_user",
                    args: encodedArguments,
                    selector: await getSelector("add_lock_private_user", TrainContractArtifact),
                    type: FunctionType.PRIVATE,
                    isStatic: false,
                    returnTypes: [],
                }
            ],
        })

        const addLockTx = await tx?.wait({ timeout: 120000 });

        return { lockCommit: addLockTx.txHash.toString(), lockId: hashlock, timelock }

    } catch (error) {
        console.error("Error building add lock transaction:", error);
        throw error;
    }
}

export const refundTransactionBuilder = async (params: RefundParams & { senderWallet: Account }) => {

    const { id, contractAddress, senderWallet } = params;

    if (!id || !contractAddress || !senderWallet) {
        throw new Error("Missing required parameters");
    }

    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "refund_private"), [id])
        const tx = senderWallet.sendTransaction({
            calls: [
                {
                    to: aztecAtomicContract,
                    name: "refund_private",
                    args: encodedArguments,
                    selector: await getSelector("refund_private", TrainContractArtifact),
                    type: FunctionType.PRIVATE,
                    isStatic: false,
                    returnTypes: [],
                }
            ],
        })

        const refundTx = await tx?.wait({ timeout: 120000 });
        return refundTx.txHash.toString();

    } catch (error) {
        console.error("Error building refund transaction:", error);
        throw error;
    }
}

export const claimTransactionBuilder = async (params: ClaimParams & { senderWallet: Account, ownershipKey?: string }) => {
    const { id, contractAddress, secret, senderWallet, ownershipKey = "" } = params;

    if (!id || !contractAddress || !secret || !senderWallet) {
        throw new Error("Missing required parameters");
    }

    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "redeem_private"), [id, secret, ownershipKey])
        const tx = senderWallet.sendTransaction({
            calls: [
                {
                    to: aztecAtomicContract,
                    name: "redeem_private",
                    args: encodedArguments,
                    selector: await getSelector("redeem_private", TrainContractArtifact),
                    type: FunctionType.PRIVATE,
                    isStatic: false,
                    returnTypes: [],
                }
            ],
        })

        const claimTx = await tx?.wait({ timeout: 120000 });
        return claimTx.txHash.toString();

    } catch (error) {
        console.error("Error building claim transaction:", error);
        throw error;
    }

}