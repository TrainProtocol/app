import {
    AztecAddress,
    encodeArguments,
    FunctionType,
} from '@aztec/aztec.js';
import { TrainContract } from "./Train";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { Account } from "../../@nemi-fi/wallet-sdk/src/exports";
import { Contract } from "../../@nemi-fi/wallet-sdk/src/exports/eip1193"
import { generateId, getFunctionAbi, getSelector, hexToHighLowValidated, hexToU128Limbs, padTo32Bytes } from './utils';
import { calculateEpochTimelock } from '../utils/calculateTimelock';
import { TokenContractArtifact } from '../../@aztec/Token';
import { toHex } from 'viem';

const TrainContractArtifact = TrainContract.artifact;

export const commitTransactionBuilder = async (props: CreatePreHTLCParams & { senderWallet: Account }) => {
    let { tokenContractAddress, srcLpAddress: lpAddress, atomicContract, sourceAsset, senderWallet, address, destinationChain, destinationAsset, amount } = props;

    if (!tokenContractAddress || !lpAddress || !atomicContract || !sourceAsset || !senderWallet) throw new Error("Missing required parameters");

    const id = generateId();
    const timelock = calculateEpochTimelock(40);
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
            sourceAsset.symbol,
            destinationChain,
            destinationAsset,
            address,
            randomness
        ]

        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "commit_private_user"), commitArgs)

        const asset = await Contract.at(
            tokenAddress,
            TokenContractArtifact,
            senderWallet
        );
        const transfer = asset
            .withAccount(senderWallet)
            .methods.transfer_to_public(
                senderWallet.getAddress(),
                contractAddress,
                parsedAmount,
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

        return { hash: commitTx?.txHash.toString(), commitId: padTo32Bytes(id.toString()) };

    } catch (error) {
        console.error("Error building commit transaction:", error);
        throw error;
    }
}

export const addLockTransactionBuilder = async (params: CommitmentParams & LockParams & { senderWallet: Account }) => {

    const { id, senderWallet, contractAddress, hashlock } = params;

    const timelock = calculateEpochTimelock(40);

    if (!senderWallet || !contractAddress || !hashlock) {
        throw new Error("Missing required parameters");
    }

    try {

        const aztecAtomicContract = AztecAddress.fromString(contractAddress);

        const atomicContract = await Contract.at(
            aztecAtomicContract,
            TrainContractArtifact,
            senderWallet,
        );


        const { high, low } = hexToHighLowValidated(hashlock)

        const addLockTx = await atomicContract.methods
            .add_lock_private_user(BigInt(id), high, low, timelock)
            .send()
            .wait({ timeout: 120000 });


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

export const claimTransactionBuilder = async (params: ClaimParams & { senderWallet: Account, ownershipKey: string }) => {
    const { id, contractAddress, secret, senderWallet, ownershipKey } = params;

    if (!id || !contractAddress || !secret || !senderWallet || !ownershipKey) {
        throw new Error("Missing required parameters");
    }

    const [secretHigh, secretLow] = hexToU128Limbs(toHex(secret));
    const [ownershipHigh, ownershipLow] = hexToU128Limbs(ownershipKey);

debugger
    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);

        // const atomicContract = await Contract.at(
        //     aztecAtomicContract,
        //     TrainContractArtifact,
        //     senderWallet,
        // );

        const redeemArgs = [
            id,
            secretHigh,
            secretLow,
            ownershipHigh,
            ownershipLow
        ]


        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "redeem_private"), redeemArgs)
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

        await tx.wait({ timeout: 120000 })

        // const tx = await atomicContract.methods
        //     .redeem_private(id, secretHigh, secretLow, ownershipHigh, ownershipLow)
        //     .send()
        //     .wait({ timeout: 120000 });


        return (await tx.getTxHash()).hash.toString();

    } catch (error) {
        console.error("Error building claim transaction:", error);
        throw error;
    }

}