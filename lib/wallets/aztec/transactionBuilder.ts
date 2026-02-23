import { AztecAddress } from '@aztec/aztec.js/addresses';
import { Wallet } from '@aztec/aztec.js/wallet';
import { AztecNode, createAztecNodeClient } from '@aztec/aztec.js/node';
import { SponsoredFeePaymentMethod } from '@aztec/aztec.js/fee';
import { SetPublicAuthwitContractInteraction } from '@aztec/aztec.js/authorization';
import { Fr } from '@aztec/aztec.js/fields';
import { TrainContract } from './Train';
import { TokenContract, TokenContractArtifact } from './Token';
import { hexToBytes, stringToBytes } from './utils';

const TX_TIMEOUT = 120000;

function createFeeOptions(sponsorAddress: string) {
    return {
        paymentMethod: new SponsoredFeePaymentMethod(AztecAddress.fromString(sponsorAddress)),
    };
}

export interface UserLockParams {
    senderWallet: Wallet;
    aztecNodeUrl: string;
    atomicContract: string;
    tokenContractAddress: string;
    amount: bigint;
    hashlock: string;
    sourceChain: string;
    destinationChain: string;
    destinationAsset: string;
    destinationAmount: string;
    address: string;
    srcLpAddress: string;
    timelockDelta?: number;
    rewardAmount?: bigint;
    rewardToken?: string;
    rewardRecipient?: string;
    rewardTimelockDelta?: number;
    quoteExpiry?: number;
    solverData?: string;
    nonce?: number;
    sponsorAddress: string;
}

export const userLockTransactionBuilder = async (props: UserLockParams) => {
    const {
        senderWallet, aztecNodeUrl, atomicContract, tokenContractAddress,
        amount, hashlock, sourceChain, destinationChain, destinationAsset,
        destinationAmount, address, srcLpAddress, timelockDelta,
        rewardAmount, rewardToken, rewardRecipient, rewardTimelockDelta,
        quoteExpiry, solverData, nonce, sponsorAddress,
    } = props;

    const feeOptions = createFeeOptions(sponsorAddress);

    try {
        const accounts = await senderWallet.getAccounts();
        const senderAddress = accounts[0].item;

        const trainAddress = AztecAddress.fromString(atomicContract);
        const tokenAddress = AztecAddress.fromString(tokenContractAddress);

        // Register Train contract
        const node: AztecNode = createAztecNodeClient(aztecNodeUrl);
        const trainInstance = await node.getContract(trainAddress);
        if (!trainInstance) throw new Error("Train contract not found");

        await senderWallet.registerContract(trainInstance, TrainContract.artifact);
        const train = TrainContract.at(trainAddress, senderWallet);

        // Register Token contract
        const tokenInstance = await node.getContract(tokenAddress);
        if (tokenInstance) {
            await senderWallet.registerContract(tokenInstance, TokenContractArtifact);
        }
        const token = TokenContract.at(tokenAddress, senderWallet);

        // Authorize public token transfer
        const transferNonce = Fr.random();
        const publicAction = token.methods.transfer_public_to_public(
            senderAddress,
            trainAddress,
            amount,
            transferNonce,
        );

        const setPublicAuthwit = await SetPublicAuthwitContractInteraction.create(
            senderWallet,
            senderAddress,
            { caller: trainAddress, action: publicAction },
            true,
        );
        await setPublicAuthwit.send({
            fee: feeOptions,
            wait: { timeout: TX_TIMEOUT },
        });

        // Get current block timestamp for quote expiry
        const latestHeader = await node.getBlockHeader('latest');
        const now = latestHeader ? Number(latestHeader.globalVariables.timestamp) : Math.floor(Date.now() / 1000);
        const effectiveQuoteExpiry = quoteExpiry ?? (now + 300);

        // Prepare byte arrays
        const hashlockBytes = hexToBytes(hashlock, 32);
        const srcChainBytes = stringToBytes(sourceChain, 30);
        const dstChainBytes = stringToBytes(destinationChain, 30);
        const dstAddressBytes = stringToBytes(address, 90);
        const dstTokenBytes = stringToBytes(destinationAsset, 90);
        const rewardRecipientBytes = stringToBytes(rewardRecipient || '', 90);
        const rewardTokenAddress = rewardToken
            ? AztecAddress.fromString(rewardToken)
            : AztecAddress.ZERO;
        const recipientAddress = AztecAddress.fromString(srcLpAddress);

        // Encode nonce/timestamp into userData (first 32 bytes, rest zeros)
        const userData = new Array(256).fill(0);
        if (nonce) {
            const nonceHex = nonce.toString(16).padStart(64, '0');
            for (let i = 0; i < 32; i++) {
                userData[i] = parseInt(nonceHex.substring(i * 2, i * 2 + 2), 16);
            }
        }

        const solverDataBytes = new Array(256).fill(0);
        if (solverData) {
            const sdClean = solverData.replace(/^0x/i, '');
            for (let i = 0; i < Math.min(sdClean.length / 2, 256); i++) {
                solverDataBytes[i] = parseInt(sdClean.substring(i * 2, i * 2 + 2), 16);
            }
        }

        // Call user_lock
        const tx = await train.methods.user_lock(
            hashlockBytes,
            amount,
            transferNonce,
            rewardAmount ?? 0n,
            timelockDelta ?? 40,
            rewardTimelockDelta ?? 0,
            effectiveQuoteExpiry,
            senderAddress,
            recipientAddress,
            tokenAddress,
            rewardTokenAddress,
            rewardRecipientBytes,
            srcChainBytes,
            dstChainBytes,
            dstAddressBytes,
            BigInt(destinationAmount || '0'),
            dstTokenBytes,
            userData,
            solverDataBytes,
        ).send({
            from: senderAddress,
            fee: feeOptions,
            wait: { timeout: TX_TIMEOUT, dontThrowOnRevert: true },
        });

        if (tx.hasExecutionReverted?.()) {
            throw new Error(`user_lock reverted: ${tx.error ?? 'unknown error'}`);
        }

        return { hash: tx.txHash?.toString() ?? String(tx), hashlock };

    } catch (error) {
        console.error("Error in userLockTransactionBuilder:", error);
        throw error;
    }
};

export interface RefundParams {
    senderWallet: Wallet;
    aztecNodeUrl: string;
    hashlock: string;
    contractAddress: string;
    sponsorAddress: string;
}

export const refundTransactionBuilder = async (params: RefundParams) => {
    const { senderWallet, aztecNodeUrl, hashlock, contractAddress, sponsorAddress } = params;

    if (!hashlock || !contractAddress || !senderWallet) {
        throw new Error("Missing required parameters");
    }

    const feeOptions = createFeeOptions(sponsorAddress);

    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const accounts = await senderWallet.getAccounts();
        const senderAddress = accounts[0].item;

        const node: AztecNode = createAztecNodeClient(aztecNodeUrl);
        const trainInstance = await node.getContract(aztecAtomicContract);
        if (!trainInstance) throw new Error("Train contract not found");

        await senderWallet.registerContract(trainInstance, TrainContract.artifact);
        const contract = TrainContract.at(aztecAtomicContract, senderWallet);

        const hashlockBytes = hexToBytes(hashlock, 32);

        const tx = await contract.methods
            .refund_user(hashlockBytes)
            .send({
                from: senderAddress,
                fee: feeOptions,
                wait: { timeout: TX_TIMEOUT, dontThrowOnRevert: true },
            });

        if (tx.hasExecutionReverted?.()) {
            throw new Error(`refund_user reverted: ${tx.error ?? 'unknown error'}`);
        }

        return tx.txHash?.toString() ?? String(tx);

    } catch (error) {
        console.error("Error in refundTransactionBuilder:", error);
        throw error;
    }
};

export interface RedeemSolverParams {
    senderWallet: Wallet;
    aztecNodeUrl: string;
    hashlock: string;
    index: number;
    secret: string | bigint;
    contractAddress: string;
    tokenContractAddress?: string;
    sponsorAddress: string;
}

export const redeemSolverTransactionBuilder = async (params: RedeemSolverParams) => {
    const { senderWallet, aztecNodeUrl, hashlock, index, secret, contractAddress, tokenContractAddress, sponsorAddress } = params;

    if (!hashlock || !contractAddress || !secret || !senderWallet) {
        throw new Error("Missing required parameters");
    }

    const feeOptions = createFeeOptions(sponsorAddress);

    const accounts = await senderWallet.getAccounts();
    const senderAddress = accounts[0].item;

    // Convert secret to hex string if bigint
    const secretHex = typeof secret === 'bigint'
        ? '0x' + secret.toString(16).padStart(64, '0')
        : String(secret);

    try {
        const aztecAtomicContract = AztecAddress.fromString(contractAddress);

        const node: AztecNode = createAztecNodeClient(aztecNodeUrl);
        const trainInstance = await node.getContract(aztecAtomicContract);
        if (!trainInstance) throw new Error("Train contract not found");

        await senderWallet.registerContract(trainInstance, TrainContract.artifact);

        if (tokenContractAddress) {
            const tokenAddress = AztecAddress.fromString(tokenContractAddress);
            const tokenInstance = await node.getContract(tokenAddress);
            if (tokenInstance) {
                await senderWallet.registerContract(tokenInstance, TokenContractArtifact);
            }
            await senderWallet.registerSender(aztecAtomicContract);
        }

        const contract = TrainContract.at(aztecAtomicContract, senderWallet);

        const hashlockBytes = hexToBytes(hashlock, 32);
        const secretBytes = hexToBytes(secretHex, 32);

        const tx = await contract.methods
            .redeem_solver(hashlockBytes, BigInt(index), secretBytes)
            .send({
                from: senderAddress,
                fee: feeOptions,
                wait: { timeout: TX_TIMEOUT, dontThrowOnRevert: true },
            });

        if (tx.hasExecutionReverted?.()) {
            throw new Error(`redeem_solver reverted: ${tx.error ?? 'unknown error'}`);
        }

        return tx.txHash?.toString() ?? String(tx);

    } catch (error) {
        console.error("Error in redeemSolverTransactionBuilder:", error);
        throw error;
    }
};
