import { Config, UseAccountReturnType } from "wagmi"
import { writeContract, simulateContract, readContract, waitForTransactionReceipt } from '@wagmi/core'
import { ethers } from "ethers"
import { createPublicClient, http, PublicClient, Chain, zeroAddress } from "viem"
import { Network } from "../../../Models/Network"
import { CreatePreHTLCParams, CommitmentParams, LockParams, RefundParams, ClaimParams } from "../../../Models/phtlc"
import { Commit, LockStatus } from "../../../Models/phtlc/PHTLC"
import HTLCAbi from "../../abis/atomic/EVM_HTLC.json"
import IMTBLZKERC20 from "../../abis/IMTBLZKERC20.json"
import formatAmount from "../../formatAmount"
import resolveChain from "../../resolveChain"
import { useSecretDerivation } from "@/context/secretDerivationContext"
import { secretToHashlock } from "@/lib/htlc/secretDerivation"
import { AtomicEVMFunctions } from "../utils/atomicTypes"

export interface UseAtomicEVMParams {
    config: Config
    account: { wallet: any, address: string } | undefined
    evmAccount: UseAccountReturnType
    networks: Network[]
    getEffectiveRpcUrls: (network: Network) => string[]
}

const minutesToSeconds = (minutes: number) => minutes * 60

export default function useAtomicEVM(params: UseAtomicEVMParams): AtomicEVMFunctions {
    const { config, account, evmAccount, networks, getEffectiveRpcUrls } = params
    const { deriveSecret } = useSecretDerivation()

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const {
            destinationChain,
            sourceChain,
            destinationAsset,
            sourceAsset,
            srcLpAddress: lpAddress,
            address,
            amount,
            decimals,
            atomicContract,
            chainId
        } = params

        const timelockDelta = minutesToSeconds(40)
        const rewardTimelockDelta = minutesToSeconds(20)
        const quoteExpiry = Math.floor(Date.now() / 1000) + minutesToSeconds(5)

        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toBigInt()

        const secret = await deriveSecret({
            chainId: Number(chainId),
            wallet: account!.wallet,
            config,
            timelock: timelockDelta
        })
        const hashlock = secretToHashlock(secret)

        const tokenAddress = sourceAsset.contract
            ? (sourceAsset.contract as `0x${string}`)
            : zeroAddress

        // Handle ERC20 approval
        if (sourceAsset.contract) {
            const allowance = await readContract(config, {
                account: account!.address as `0x${string}`,
                abi: IMTBLZKERC20,
                address: sourceAsset.contract as `0x${string}`,
                functionName: 'allowance',
                args: [account!.address, atomicContract],
                chainId: Number(chainId),
            })

            if (Number(allowance) < parsedAmount) {
                const res = await writeContract(config, {
                    account: account!.address as `0x${string}`,
                    abi: IMTBLZKERC20,
                    address: sourceAsset.contract as `0x${string}`,
                    functionName: 'approve',
                    args: [atomicContract, parsedAmount],
                    chainId: Number(chainId),
                })

                await waitForTransactionReceipt(config, {
                    chainId: Number(chainId),
                    hash: res,
                })
            }
        }

        const userLockParams = {
            hashlock,
            amount: parsedAmount,
            rewardAmount: 0n,
            timelockDelta,
            rewardTimelockDelta,
            quoteExpiry,
            sender: account!.address as `0x${string}`,
            recipient: lpAddress as `0x${string}`,
            token: tokenAddress,
            rewardToken: '',
            rewardRecipient: '',
            srcChain: sourceChain || ''
        }

        const destinationInfo = {
            dstChain: destinationChain,
            dstAddress: address,
            dstAmount: parsedAmount,
            dstToken: destinationAsset
        }

        const simulationData: any = {
            account: account!.address as `0x${string}`,
            abi: HTLCAbi,
            address: atomicContract,
            functionName: 'userLock',
            args: [userLockParams, destinationInfo, '0x'],
            chainId: Number(chainId),
        }

        if (!sourceAsset.contract) {
            simulationData.value = parsedAmount
        }

        const { request } = await simulateContract(config, simulationData)
        const hash = await writeContract(config, request)

        return { hash, commitId: hashlock }
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        const { chainId, id, contractAddress } = params

        const result: any = await readContract(config, {
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'getUserLock',
            args: [id],
            chainId: Number(chainId),
        })

        const lockExists = result.sender !== zeroAddress

        return {
            hashlock: lockExists ? id : undefined,
            amount: formatAmount(Number(result.amount), 18),
            secret: result.secret != 0n ? BigInt(result.secret) : undefined,
            sender: lockExists ? result.sender : undefined,
            recipient: result.recipient !== zeroAddress ? result.recipient : undefined,
            token: result.token !== zeroAddress ? result.token : undefined,
            timelock: Number(result.timelock),
            status: lockExists ? Number(result.status) as LockStatus : undefined,
            claimed: Number(result.status)
        }
    }

    const secureGetDetails = async (params: CommitmentParams): Promise<Commit | null> => {
        const { chainId, id, contractAddress } = params

        const network = networks.find(n => n.chainId === chainId)
        if (!network) throw new Error("No network found")

        const nodeUrls = getEffectiveRpcUrls(network)
        if (!nodeUrls) throw new Error("No node urls found")

        const chain = resolveChain(network, nodeUrls[0]) as Chain

        const clients = nodeUrls.map((node) =>
            createPublicClient({ transport: http(node), chain })
        )

        const results = await Promise.all(clients.map((client) =>
            client.readContract({
                abi: HTLCAbi,
                address: contractAddress as `0x${string}`,
                functionName: 'getUserLock',
                args: [id],
            })
        ))

        const validResults = results.filter((r: any) => r.amount > 0n)
        if (!validResults.length) return null

        const [firstResult, ...otherResults] = validResults as any[]
        if (!otherResults.every((r: any) => r.amount === firstResult.amount)) {
            throw new Error('Lock details do not match across the provided nodes')
        }

        return {
            hashlock: id,
            amount: formatAmount(Number(firstResult.amount), 18),
            secret: firstResult.secret != 0n ? BigInt(firstResult.secret) : undefined,
            sender: firstResult.sender !== zeroAddress ? firstResult.sender : undefined,
            recipient: firstResult.recipient !== zeroAddress ? firstResult.recipient : undefined,
            token: firstResult.token !== zeroAddress ? firstResult.token : undefined,
            timelock: Number(firstResult.timelock),
            status: Number(firstResult.status) as LockStatus,
            claimed: Number(firstResult.status)
        }
    }

    const addLock = async (_params: CommitmentParams & LockParams) => {
        throw new Error("addLock is not supported - hashlock is provided in userLock()")
    }

    const refund = async (params: RefundParams) => {
        const { chainId, id, contractAddress } = params

        const { request } = await simulateContract(config, {
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'refundUser',
            args: [id],
            chainId: Number(chainId),
        })

        return await writeContract(config, request)
    }

    const claim = async (params: ClaimParams) => {
        const { chainId, id, contractAddress, secret } = params

        const { request } = await simulateContract(config, {
            account: evmAccount!.address as `0x${string}`,
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'redeemUser',
            args: [id, BigInt(secret)],
            chainId: Number(chainId),
        })

        return await writeContract(config, request)
    }

    return {
        createPreHTLC,
        getDetails,
        secureGetDetails,
        addLock,
        refund,
        claim
    }
}
