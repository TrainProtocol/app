import { cairo, Call, constants, Contract, RpcProvider, shortString, TypedData, TypedDataRevision } from "starknet"
import { ethers } from "ethers"
import { toHex } from "viem"
import { CreateHTLCParams, LockParams, OldLockParams, RefundParams, ClaimParams, GetCommitsParams } from "../../../Models/phtlc"
import { LockDetails } from "../../../Models/phtlc/PHTLC"
import PHTLCAbi from "../../abis/atomic/STARKNET_PHTLC.json"
import ETHABbi from "../../abis/STARKNET_ETH.json"
import formatAmount from "../../formatAmount"
import TrainApiClient from "../../trainApiClient"
import { calculateEpochTimelock } from "../utils/calculateTimelock"
import { useSecretDerivation } from "@/context/secretDerivationContext"
import { generateRandomId } from "../utils/atomicHelpers"
import { BaseAtomicFunctions } from "../utils/atomicTypes"

export interface UseAtomicStarknetParams {
    starknetWallet: any
    nodeUrl: string | undefined
}
const apiClient = new TrainApiClient()

export default function useAtomicStarknet(params: UseAtomicStarknetParams): BaseAtomicFunctions {
    const { starknetWallet, nodeUrl } = params
    const { deriveSecret } = useSecretDerivation()

    const createHTLC = async (params: CreateHTLCParams) => {
        const { destinationChain, destinationAsset, sourceAsset, srcLpAddress: lpAddress, address, tokenContractAddress, amount, decimals, atomicContract: atomicAddress } = params

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }
        if (!tokenContractAddress) {
            throw new Error('No token contract address')
        }

        try {
            const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toString()

            const erc20Contract = new Contract(
                {
                    abi: ETHABbi,
                    address: tokenContractAddress,
                    providerOrAccount: starknetWallet.metadata?.starknetAccount,
                }
            )
            const increaseAllowanceCall: Call = erc20Contract.populate("increaseAllowance", [atomicAddress, parsedAmount])

            const id = generateRandomId() as string
            const timelock = calculateEpochTimelock(20);
            
            // Secret derivation for HTLC with hashlock
            const secret = await deriveSecret({
                wallet: starknetWallet
            });
            // const hashlock = secretToHashlock(secret);
            
            // Note: Add hashlock to args array when contract supports it
            // For hashlock-based contracts, insert hashlock in the appropriate position
            const args = [
                BigInt(id),
                parsedAmount,
                destinationChain,
                destinationAsset,
                address,
                sourceAsset.symbol,
                lpAddress,
                timelock,
                tokenContractAddress,
            ]
            const atomicContract = new Contract(
                {
                    abi: PHTLCAbi,
                    address: atomicAddress,
                    providerOrAccount: starknetWallet.metadata?.starknetAccount,
                }
            )

            const committmentCall: Call = atomicContract.populate("commit", args)

            const trx = (await starknetWallet?.metadata?.starknetAccount?.execute([increaseAllowanceCall, committmentCall]))

            await starknetWallet.metadata.starknetAccount.waitForTransaction(
                trx.transaction_hash
            );

            return { hash: trx.transaction_hash as `0x${string}`, hashlock: id }
        }
        catch (e) {
            console.log(e)
            throw new Error(e)
        }

    }

    const refund = async (params: RefundParams) => {
        const { contractAddress: atomicAddress, id } = params

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }

        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: atomicAddress,
                providerOrAccount: starknetWallet.metadata?.starknetAccount,
            }
        )

        const refundCall: Call = atomicContract.populate('refund', [id])
        const trx = (await starknetWallet?.metadata?.starknetAccount?.execute(refundCall))

        if (!trx) {
            throw new Error("No result")
        }
        return trx.transaction_hash
    }

    const claim = async (params: ClaimParams) => {
        const { contractAddress: atomicAddress, id, secret } = params

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }

        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: atomicAddress,
                providerOrAccount: starknetWallet.metadata?.starknetAccount,
            }
        )

        const claimCall: Call = atomicContract.populate('redeem', [id, secret])
        const trx = (await starknetWallet?.metadata?.starknetAccount?.execute(claimCall))

        if (!trx) {
            throw new Error("No result")
        }

        return trx.transaction_hash
    }

    const getDetails = async (params: LockParams): Promise<LockDetails> => {
        const { id, chainId, contractAddress } = params
        try {

            const atomicContract = new Contract(
                {
                    abi: PHTLCAbi,
                    address: contractAddress,
                    providerOrAccount: new RpcProvider({
                        nodeUrl: nodeUrl,
                    }),
                }
            )

            const result = await atomicContract.functions.getHTLCDetails(id)

            if (!result) {
                throw new Error("No result")
            }

            // const networkToken = networks.find(network => chainId && Number(network.chainId) == Number(chainId))?.tokens.find(token => token.symbol === "ETH")//shortString.decodeShortString(ethers.utils.hexlify(result.srcAsset as BigNumberish)))

            const parsedResult: LockDetails = {
                ...result,
                sender: toHex(result.sender),
                amount: formatAmount(result.amount, 18), //networkToken?.decimals
                hashlock: result.hashlock && toHex(result.hashlock, { size: 32 }),
                claimed: Number(result.claimed),
                secret: BigInt(result.secret),
                timelock: Number(result.timelock),
            }

            return parsedResult
        }
        catch (e) {
            console.log(e)
            throw new Error(e)
        }
    }


    const addLock = async (params: LockParams & OldLockParams) => {
        const { id, hashlock, contractAddress } = params
        const timelock = calculateEpochTimelock(20)

        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }
        const args = [
            id,
            hashlock,
            timelock
        ]
        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: contractAddress,
                providerOrAccount: starknetWallet.metadata?.starknetAccount,
            }
        )

        const committmentCall: Call = atomicContract.populate("addLock", args)

        const trx = (await starknetWallet?.metadata?.starknetAccount?.execute(committmentCall))
        return { hash: trx.transaction_hash as `0x${string}`, result: trx.transaction_hash as `0x${string}` }
    }

    const addLockSig = async (params: LockParams & OldLockParams) => {
        const { id, hashlock, solver } = params;
        if (!starknetWallet?.metadata?.starknetAccount) {
            throw new Error('Wallet not connected')
        }
        const timelock = calculateEpochTimelock(20);
        const u256Id = cairo.uint256(id);
        const u256Hashlock = cairo.uint256(hashlock);
        const u256TimeLock = cairo.uint256(timelock);

        const addlockData: TypedData = {
            domain: {
                name: 'Train',
                version: shortString.encodeShortString("v1"),
                chainId: process.env.NEXT_PUBLIC_API_VERSION === 'sandbox' ? constants.StarknetChainId.SN_SEPOLIA : constants.StarknetChainId.SN_MAIN,
                revision: TypedDataRevision.ACTIVE,
            },
            message: {
                Id: u256Id,
                hashlock: u256Hashlock,
                timelock: u256TimeLock,
            },
            primaryType: 'AddLockMsg',
            types: {
                StarknetDomain: [
                    {
                        name: 'name',
                        type: 'shortstring',
                    },
                    {
                        name: 'version',
                        type: 'shortstring',
                    },
                    {
                        name: 'chainId',
                        type: 'shortstring',
                    },
                    {
                        name: 'revision',
                        type: 'shortstring'
                    }
                ],
                AddLockMsg: [
                    { name: 'Id', type: 'u256' },
                    { name: 'hashlock', type: 'u256' },
                    { name: 'timelock', type: 'u256' }
                ],
            }
        }
        const signature = await starknetWallet?.metadata?.starknetAccount.signMessage(addlockData)

        // AddLockSig not supported in Station API — Starknet chain not yet migrated

        return { hash: signature as any, result: signature }

    }

    const getContracts = async (params: GetCommitsParams) => {
        const { contractAddress } = params

        const atomicContract = new Contract(
            {
                abi: PHTLCAbi,
                address: contractAddress,
                providerOrAccount: new RpcProvider({
                    nodeUrl: nodeUrl,
                }),
            }
        )

        if (!starknetWallet?.address) {
            throw new Error('No connected wallet')
        }

        const result = await atomicContract.functions.getCommits(starknetWallet?.address)

        if (!result) {
            throw new Error("No result")
        }

        return result.reverse().map((commit: any) => toHex(commit, { size: 32 }))
    }

    return {
    createHTLC,
    getUserLockDetails: getDetails,
    refund,
    claim,
    getSolverLockDetails: function (params: LockParams): Promise<LockDetails | null> {
        throw new Error("Function not implemented.")
    }
}
}
