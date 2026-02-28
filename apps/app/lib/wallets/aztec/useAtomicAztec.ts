import { AztecAddress } from "@aztec/aztec.js/addresses"
import { AztecNode, createAztecNodeClient } from "@aztec/aztec.js/node"
import { CreateHTLCParams, LockParams, RefundParams, ClaimParams } from "../../../Models/phtlc"
import { LockDetails, LockStatus } from "../../../Models/phtlc/PHTLC"
import { hexToBytes, bytesToHex } from "./utils"
import formatAmount from "../../formatAmount"
import { TrainContract } from "./Train"
import { BaseAtomicFunctions } from "../utils/atomicTypes"
import { parseUnits } from "viem"

export interface UseAtomicAztecParams {
    wallet: any
    accountAddress: string | undefined | null
    aztecNodeUrl: string
    sponsorAddress: string
}

export default function useAtomicAztec(params: UseAtomicAztecParams): BaseAtomicFunctions {
    const { wallet, accountAddress, aztecNodeUrl, sponsorAddress } = params

    const createHTLC = async (params: CreateHTLCParams) => {
        const { nonce: timestamp, hashlock } = params;
        if (!wallet) throw new Error("No wallet connected");

        const parsedAmount = parseUnits(params.amount.toString(), params.sourceAsset.decimals);

        const { userLockTransactionBuilder } = await import('./transactionBuilder')

        const tx = await userLockTransactionBuilder({
            senderWallet: wallet,
            aztecNodeUrl,
            atomicContract: params.atomicContract,
            tokenContractAddress: params.tokenContractAddress!,
            amount: parsedAmount,
            hashlock,
            sourceChain: params.sourceChain,
            destinationChain: params.destinationChain,
            destinationAsset: params.destinationAsset,
            destinationAmount: params.destinationAmount,
            address: params.address,
            srcLpAddress: params.srcLpAddress,
            timelockDelta: params.timelockDelta,
            rewardAmount: params.rewardAmount ? BigInt(params.rewardAmount) : undefined,
            rewardToken: params.rewardToken,
            rewardRecipient: params.rewardRecipient,
            rewardTimelockDelta: params.rewardTimelockDelta,
            quoteExpiry: params.quoteExpiry,
            solverData: params.solverData,
            nonce: timestamp,
            sponsorAddress,
        })

        return { hash: tx.hash, hashlock, nonce: timestamp }
    }

    const getContractInstance = async (contractAddress: string) => {
        if (!wallet || !accountAddress) throw new Error("No wallet connected");

        const aztecAtomicContract = AztecAddress.fromString(contractAddress);
        const node: AztecNode = createAztecNodeClient(aztecNodeUrl);
        const trainInstance = await node.getContract(aztecAtomicContract);

        if (!trainInstance) throw new Error("Train contract not found");

        await wallet.registerContract(trainInstance, TrainContract.artifact);
        const contract = TrainContract.at(aztecAtomicContract, wallet);
        const userAztecAddress = AztecAddress.fromString(accountAddress);

        return { contract, userAztecAddress };
    }

    const getUserLockDetails = async (params: LockParams): Promise<LockDetails | null> => {
        const { id, contractAddress } = params;

        const { contract, userAztecAddress } = await getContractInstance(contractAddress);

        const hashlockBytes = hexToBytes(id, 32);
        const result: any = await contract.methods
            .get_user_lock(hashlockBytes)
            .simulate({ from: userAztecAddress });

        const status = Number(result.status) as LockStatus;
        if (status === LockStatus.Empty) return null;

        // Convert secret bytes to bigint (all-zero = not revealed yet)
        const secretBytes: number[] = Array.from(result.secret || []);
        const secretHex = secretBytes.length > 0 ? bytesToHex(secretBytes) : '0x0';
        const secretBigInt = BigInt(secretHex);
        const secret = secretBigInt !== 0n ? secretBigInt : undefined;

        return {
            hashlock: id,
            amount: Number(formatAmount(BigInt(result.amount), 8)),
            sender: result.sender?.toString(),
            recipient: result.recipient?.toString(),
            token: result.token?.toString(),
            timelock: Number(result.timelock),
            secret,
            status,
            claimed: Number(result.status),
        }
    }

    const getSolverLockDetails = async (params: LockParams): Promise<LockDetails | null> => {
        const { id, contractAddress } = params;

        const { contract, userAztecAddress } = await getContractInstance(contractAddress);

        const hashlockBytes = hexToBytes(id, 32);

        // Check solver lock count first
        const count = await contract.methods
            .get_solver_lock_count(hashlockBytes)
            .simulate({ from: userAztecAddress });

        if (Number(count) === 0) return null;

        // Get the first solver lock (index 1, 1-based)
        const result: any = await contract.methods
            .get_solver_lock(hashlockBytes, BigInt(1))
            .simulate({ from: userAztecAddress });

        const status = Number(result.status) as LockStatus;
        if (status === LockStatus.Empty) return null;

        const secretBytes: number[] = Array.from(result.secret || []);
        const secretHex = secretBytes.length > 0 ? bytesToHex(secretBytes) : '0x0';
        const secretBigInt = BigInt(secretHex);
        const secret = secretBigInt !== 0n ? secretBigInt : undefined;

        return {
            hashlock: id,
            amount: Number(formatAmount(BigInt(result.amount), 8)),
            sender: result.sender?.toString(),
            recipient: result.recipient?.toString(),
            token: result.token?.toString(),
            timelock: Number(result.timelock),
            reward: Number(formatAmount(BigInt(result.reward), 8)),
            rewardTimelock: Number(result.reward_timelock),
            rewardRecipient: result.reward_recipient?.toString(),
            rewardToken: result.reward_token?.toString(),
            status,
            claimed: Number(result.status),
            secret,
            index: 0,
        }
    }

    const refund = async (params: RefundParams) => {
        if (!wallet) throw new Error("No wallet connected");

        const { refundTransactionBuilder } = await import('./transactionBuilder')

        return await refundTransactionBuilder({
            senderWallet: wallet,
            aztecNodeUrl,
            hashlock: params.id,
            contractAddress: params.contractAddress,
            sponsorAddress,
        })
    }

    const claim = async (params: ClaimParams) => {
        if (!wallet) throw new Error("No wallet connected");

        const { redeemSolverTransactionBuilder } = await import('./transactionBuilder')

        return await redeemSolverTransactionBuilder({
            senderWallet: wallet,
            aztecNodeUrl,
            hashlock: params.id,
            index: params.index ?? 1,
            secret: params.secret,
            contractAddress: params.contractAddress,
            tokenContractAddress: params.destinationAsset?.contractAddress,
            sponsorAddress,
        })
    }

    return {
        createHTLC,
        getUserLockDetails,
        getSolverLockDetails,
        refund,
        claim
    }
}
