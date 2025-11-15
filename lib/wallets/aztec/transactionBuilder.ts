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
import { encodeArguments, FunctionType } from '@aztec/aztec.js/abi';
import { AztecNode, createAztecNodeClient } from '@aztec/aztec.js/node';
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee';
import { aztecNodeUrl } from './configs';

const TrainContractArtifact = TrainContract.artifact;

export const commitTransactionBuilder = async (props: CreatePreHTLCParams & { senderWallet: Wallet }) => {
    let { tokenContractAddress, srcLpAddress: lpAddress, atomicContract, sourceAsset, senderWallet, address, destinationChain, destinationAsset, amount } = props;

    if (!tokenContractAddress || !lpAddress || !atomicContract || !sourceAsset || !senderWallet) throw new Error("Missing required parameters");

    const id = generateId();
    const timelock = calculateEpochTimelock(40);
    const parsedAmount = Math.pow(10, sourceAsset.decimals) * Number(amount);

    try {
        const accounts = await senderWallet.getAccounts();
        const senderAddress = accounts[0].item;

        const contractAddress = AztecAddress.fromString(atomicContract);
        const tokenAddress = AztecAddress.fromString('0x04593cd209ec9cce4c2bf3af9003c262fbda9157d75788f47e45a14db57fac3b');

        const node: AztecNode = createAztecNodeClient(aztecNodeUrl);
        const trainInstance = await node.getContract(contractAddress);

        if (!trainInstance) {
            throw new Error("Train contract not found");
        }

        await senderWallet.registerContract(trainInstance, TrainContract.artifact);
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

        const randomness = Fr.random();

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

        const feeOptions = {
            paymentMethod: new SponsoredFeePaymentMethod(AztecAddress.fromString('0x280e5686a148059543f4d0968f9a18cd4992520fcd887444b8689bf2726a1f97')),
        };

        const tx = await contract.methods
            .commit_private_user(
                Fr.fromString(id),
                AztecAddress.fromString(lpAddress),
                timelock,
                tokenAddress,
                parsedAmount,
                sourceAsset.symbol,
                destinationChain,
                destinationAsset,
                address,
                randomness
            )
            .send({
                from: senderAddress,
                authWitnesses: [{
                    requestHash: witness.requestHash,
                    witness: witness.witness,
                } as any],
                fee: feeOptions,
            })
            .wait({ timeout: 120000 });

        if (!tx) {
            throw new Error("Transaction failed or timed out");
        }

        return { hash: tx.txHash.toString(), commitId: padTo32Bytes(id.toString()) };

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