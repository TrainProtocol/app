import {
    AztecAddress,
    encodeArguments,
    FunctionType,
} from '@aztec/aztec.js';
import {
    TokenContractArtifact,
} from "@aztec/noir-contracts.js/Token";
import { TrainContract } from "./Train";
import { CommitmentParams, CreatePreHTLCParams, LockParams } from "../../../Models/phtlc";
import { Account } from "../../@nemi-fi/wallet-sdk/src/exports";
import { Contract } from "../../@nemi-fi/wallet-sdk/src/exports/eip1193"
import { generateId, getFunctionAbi, getSelector } from './utils';

const TrainContractArtifact = TrainContract.artifact;

interface Props extends CreatePreHTLCParams {
    senderWallet: Account;
}

export const commitTransactionBuilder = async (props: Props) => {
    // const { tokenContractAddress, lpAddress, atomicContract, sourceAsset, senderWallet, address, destinationChain, destinationAsset } = props;

    const dataOverrides = {
        ...props,
        atomicContract: '0x07f2f253b6f221be99da24de16651f9481df4e31d67420a1f8a86d2b444e8107',
        tokenContractAddress: '0x16083d0891f6d8d3fea6cca7faa8c72da7a88dab141fce18d4e917281c55c952',
    }

    const { tokenContractAddress, lpAddress, atomicContract, sourceAsset, senderWallet, address, destinationChain, destinationAsset } = dataOverrides;

    if (!tokenContractAddress || !lpAddress || !atomicContract || !sourceAsset || !senderWallet) throw new Error("Missing required parameters");

    const id = generateId();
    const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
    const timeLockMS = Date.now() + LOCK_TIME
    const timelock = Math.floor(timeLockMS / 1000).toString()
    const amount = '23';

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
            amount,
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

    const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
    const timelockMs = Date.now() + LOCK_TIME
    const timelock = Math.floor(timelockMs / 1000)

    if (!senderWallet || !contractAddress || !hashlock) {
        throw new Error("Missing required parameters");
    }

    const uint8ArrayHashlock = new TextEncoder().encode(hashlock);

    try {

        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const atomicContract = await Contract.at(
            aztecAtomicContract,
            TrainContractArtifact,
            senderWallet,
        );

        const addLockTx = await atomicContract.methods
            .add_lock_private_user(id, uint8ArrayHashlock, timelock)
            .send()
            .wait({ timeout: 120000 });

        return { lockCommit: addLockTx.txHash.toString(), lockId: hashlock, timelock: timelock }

    } catch (error) {
        console.error("Error building add lock transaction:", error);
        throw error;
    }

}