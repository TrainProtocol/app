import { cairo, Call, constants, Contract, RpcProvider, shortString, TypedData, TypedDataRevision } from "starknet"
import { ethers } from "ethers"
import { toHex } from "viem"
import { Network } from "../../../Models/Network"
import { CreatePreHTLCParams, CommitmentParams, LockParams, RefundParams, ClaimParams, GetCommitsParams } from "../../../Models/phtlc"
import { Commit } from "../../../Models/phtlc/PHTLC"
import PHTLCAbi from "../../abis/atomic/STARKNET_PHTLC.json"
import ETHABbi from "../../abis/STARKNET_ETH.json"
import formatAmount from "../../formatAmount"
import LayerSwapApiClient from "../../trainApiClient"
import { calculateEpochTimelock } from "../utils/calculateTimelock"

export interface UseAtomicStarknetParams {
    starknetWallet: any
    nodeUrl: string | undefined
}

export interface AtomicStarknetFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<{ hash: string, commitId: string }>
    getDetails: (params: CommitmentParams) => Promise<Commit>
    addLock: (params: CommitmentParams & LockParams) => Promise<{ hash: string, result: any }>
    addLockSig: (params: CommitmentParams & LockParams) => Promise<{ hash: string, result: any }>
    refund: (params: RefundParams) => Promise<string>
    claim: (params: ClaimParams) => Promise<string>
    getContracts: (params: GetCommitsParams) => Promise<any>
}

export default function useAtomicStarknet(params: UseAtomicStarknetParams): AtomicStarknetFunctions {
    const { starknetWallet, nodeUrl } = params

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
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

            function generateBytes32Hex() {
                const bytes = new Uint8Array(32); // 32 bytes = 64 hex characters
                crypto.getRandomValues(bytes);
                return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
            }
            const id = `0x${generateBytes32Hex()}`
            const timelock = calculateEpochTimelock(20);
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

            return { hash: trx.transaction_hash as `0x${string}`, commitId: id }
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

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
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

            const parsedResult: Commit = {
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


    const addLock = async (params: CommitmentParams & LockParams) => {
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

    const addLockSig = async (params: CommitmentParams & LockParams) => {
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
        const apiClient = new LayerSwapApiClient()

        try {
            await apiClient.AddLockSig({
                signatureArray: signature,
                timelock,
            },
                id,
                solver
            )
        } catch (e) {
            throw new Error("Failed to add lock")
        }

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
        createPreHTLC,
        getDetails,
        addLock,
        addLockSig,
        refund,
        claim,
        getContracts
    }
}
