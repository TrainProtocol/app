import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Wallet } from '@aztec/aztec.js/wallet';
import { TrainContract } from "./Train";
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, LockParams, RefundParams } from "../../../Models/phtlc";
import { generateId, getFunctionAbi, getSelector, hexToHighLowValidated, hexToU128Limbs, padTo32Bytes } from './utils';
import { calculateEpochTimelock } from '../utils/calculateTimelock';
import { toHex } from 'viem';
import { TokenContract, TokenContractArtifact } from '@aztec/noir-contracts.js/Token';
import { Fr } from '@aztec/aztec.js/fields';
import { CallIntent } from '@aztec/aztec.js/authorization';
import { ContractArtifact, encodeArguments, FunctionType } from '@aztec/aztec.js/abi';

const TrainContractArtifact = TrainContract.artifact as ContractArtifact;

export const commitTransactionBuilder = async (props: CreatePreHTLCParams & { senderWallet: Wallet }) => {
    let { tokenContractAddress, srcLpAddress: lpAddress, atomicContract, sourceAsset, senderWallet, address, destinationChain, destinationAsset, amount } = props;

    if (!tokenContractAddress || !lpAddress || !atomicContract || !sourceAsset || !senderWallet) throw new Error("Missing required parameters");

    const id = generateId();
    const timelock = calculateEpochTimelock(40);
    const parsedAmount = Math.pow(10, sourceAsset.decimals) * Number(amount);

    try {
        // Get the sender address from wallet
        const accounts = await senderWallet.getAccounts();
        const senderAddress = accounts[0].item;

        const contractAddress = AztecAddress.fromString(atomicContract);
        const tokenAddress = AztecAddress.fromString(tokenContractAddress);

        // Use standard TrainContract.at() instead of custom Contract
        const contract = await TrainContract.at(
            contractAddress,
            senderWallet,
        );

        const is_contract_initialized = await contract.methods
            .is_contract_initialized(Fr.fromString(id))
            .simulate({ from: senderAddress });

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

        const asset = await TokenContract.at(
            tokenAddress,
            senderWallet
        );

        const intentCallSelector = await getSelector("transfer_to_public", TokenContractArtifact);
        const intentCallArgs = [senderAddress, contractAddress, parsedAmount, randomness];
        const encodedIntentCallArgs = encodeArguments(getFunctionAbi(TokenContractArtifact, "transfer_to_public"), intentCallArgs)

        const intent: CallIntent = {
            caller: contractAddress,
            call: {
                to: tokenAddress,
                name: "transfer_to_public",
                args: encodedIntentCallArgs,
                selector: intentCallSelector,
                hideMsgSender: true,
                type: FunctionType.PUBLIC,
                isStatic: false,
                returnTypes: [],
            },
        };

        const witness = await senderWallet.createAuthWit(senderAddress, intent);

        const txCallSelector = await getSelector("commit_private_user", TrainContractArtifact);
        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "commit_private_user"), commitArgs)

        const tx = await senderWallet.batch([
            {
                name: "registerContract",
                args: [
                    contract,
                    TrainContractArtifact,
                    undefined
                ]
            },
            {
                name: "registerContract",
                args: [
                    asset,
                    TokenContractArtifact,
                    undefined
                ]
            },
            {
                name: "sendTx",
                args: [
                    {
                        calls: [
                            {
                                to: contractAddress,
                                name: "commit_private_user",
                                args: encodedArguments as any,
                                selector: txCallSelector as any,
                                type: FunctionType.PRIVATE,
                                isStatic: false,
                                returnTypes: [],
                                hideMsgSender: true,
                            }
                        ],
                        authWitnesses: [witness],
                        capsules: [],
                        extraHashedArgs: []
                    },
                    { from: senderAddress }
                ]
            }
        ])


        if (!tx) {
            throw new Error("Transaction failed or timed out");
        }

        return { hash: tx[2].result.hash.toString(), commitId: padTo32Bytes(id.toString()) };

    } catch (error) {
        console.error("Error building commit transaction:", error);
        throw error;
    }
}

export const addLockTransactionBuilder = async (params: CommitmentParams & LockParams & { senderWallet: Wallet }) => {

    const { id, senderWallet, contractAddress, hashlock } = params;

    const timelock = calculateEpochTimelock(40);

    if (!senderWallet || !contractAddress || !hashlock) {
        throw new Error("Missing required parameters");
    }

    const accounts = await senderWallet.getAccounts();
    const senderAddress = accounts[0].item;

    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);

        // Use standard TrainContract.at() instead of custom Contract
        const atomicContract = await TrainContract.at(
            aztecAtomicContract,
            senderWallet,
        );

        const { high, low } = hexToHighLowValidated(hashlock)

        // Use standard contract method .send() and .wait()
        const addLockTx = await atomicContract.methods
            .add_lock_private_user(BigInt(id), high, low, timelock)
            .send({ from: senderAddress })
            .wait({ timeout: 120000 });

        return { lockCommit: addLockTx.txHash.toString(), lockId: hashlock, timelock }

    } catch (error) {
        console.error("Error building add lock transaction:", error);
        throw error;
    }
}

export const refundTransactionBuilder = async (params: RefundParams & { senderWallet: Wallet }) => {

    const { id, contractAddress, senderWallet } = params;

    if (!id || !contractAddress || !senderWallet) {
        throw new Error("Missing required parameters");
    }

    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "refund_private"), [id])

        const accounts = await senderWallet.getAccounts();
        const senderAddress = accounts[0].item;

        // Use wallet.createTx() for custom transaction structure
        const refundTx = await senderWallet.sendTx({
            calls: [
                {
                    to: aztecAtomicContract,
                    name: "refund_private",
                    args: encodedArguments,
                    selector: await getSelector("refund_private", TrainContractArtifact),
                    type: FunctionType.PRIVATE,
                    hideMsgSender: true,
                    isStatic: false,
                    returnTypes: [],
                }
            ],
            authWitnesses: [],
            capsules: [],
            extraHashedArgs: [],
        }, { from: senderAddress });

        return refundTx.hash.toString();

    } catch (error) {
        console.error("Error building refund transaction:", error);
        throw error;
    }
}

export const claimTransactionBuilder = async (params: ClaimParams & { senderWallet: Wallet, ownershipKey: string }) => {
    const { id, contractAddress, secret, senderWallet, ownershipKey, destinationAsset } = params;

    if (!id || !contractAddress || !secret || !senderWallet || !ownershipKey || !destinationAsset?.contract) {
        throw new Error("Missing required parameters");
    }

    const aztecTokenAddress = AztecAddress.fromString(destinationAsset.contract);

    const accounts = await senderWallet.getAccounts();
    const senderAddress = accounts[0].item;

    const [secretHigh, secretLow] = hexToU128Limbs(toHex(secret));
    const [ownershipHigh, ownershipLow] = hexToU128Limbs(ownershipKey);

    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const contract = await TrainContract.at(
            aztecAtomicContract,
            senderWallet,
        );

        const asset = await TokenContract.at(
            aztecTokenAddress,
            senderWallet
        );


        const redeemArgs = [
            id,
            secretHigh,
            secretLow,
            ownershipHigh,
            ownershipLow
        ]

        const encodedArguments = encodeArguments(getFunctionAbi(TrainContractArtifact, "redeem_private"), redeemArgs)

        const tx = await senderWallet.batch([
            {
                name: "registerContract",
                args: [
                    contract,
                    TrainContractArtifact,
                    undefined
                ]
            },
            {
                name: "registerContract",
                args: [
                    asset,
                    TokenContractArtifact,
                    undefined
                ]
            },
            {
                name: "sendTx",
                args: [
                    {
                        calls: [
                            {
                                to: aztecAtomicContract,
                                name: "redeem_private",
                                args: encodedArguments,
                                selector: await getSelector("redeem_private", TrainContractArtifact),
                                type: FunctionType.PRIVATE,
                                isStatic: false,
                                returnTypes: [],
                                hideMsgSender: true,
                            }
                        ],
                        authWitnesses: [],
                        capsules: [],
                        extraHashedArgs: []
                    },
                    { from: senderAddress }
                ]
            }
        ])

        return tx[2].result.hash.toString();

    } catch (error) {
        console.error("Error building claim transaction:", error);
        throw error;
    }
}