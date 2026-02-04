import { Config, UseAccountReturnType } from "wagmi"
import { writeContract, simulateContract, readContract, waitForTransactionReceipt, signTypedData } from '@wagmi/core'
import { ethers } from "ethers"
import { createPublicClient, http, PublicClient, Chain } from "viem"
import { Network } from "../../../Models/Network"
import { CreatePreHTLCParams, CommitmentParams, LockParams, RefundParams, ClaimParams } from "../../../Models/phtlc"
import { Commit } from "../../../Models/phtlc/PHTLC"
import PHTLCAbi from "../../abis/atomic/EVM_PHTLC.json"
import ERC20PHTLCAbi from "../../abis/atomic/EVMERC20_PHTLC.json"
import IMTBLZKERC20 from "../../abis/IMTBLZKERC20.json"
import formatAmount from "../../formatAmount"
import LayerSwapApiClient from "../../trainApiClient"
import resolveChain from "../../resolveChain"
import { calculateEpochTimelock } from "../utils/calculateTimelock"
import { useSecretDerivation } from "@/context/secretDerivationContext"
import { secretToHashlock } from "@/lib/htlc/secretDerivation"

export interface UseAtomicEVMParams {
    config: Config
    account: { wallet: any, address: string } | undefined
    evmAccount: UseAccountReturnType
    networks: Network[]
    getEffectiveRpcUrls: (network: Network) => string[]
}

export interface AtomicEVMFunctions {
    createPreHTLC: (params: CreatePreHTLCParams) => Promise<{ hash: string, commitId: string }>
    getDetails: (params: CommitmentParams) => Promise<Commit>
    secureGetDetails: (params: CommitmentParams) => Promise<Commit | null>
    addLock: (params: CommitmentParams & LockParams) => Promise<{ hash: string, result: any }>
    refund: (params: RefundParams) => Promise<string>
    claim: (params: ClaimParams) => Promise<string>
}

export default function useAtomicEVM(params: UseAtomicEVMParams): AtomicEVMFunctions {
    const { config, account, evmAccount, networks, getEffectiveRpcUrls } = params
    const { deriveSecret } = useSecretDerivation()

    const createPreHTLC = async (params: CreatePreHTLCParams) => {
        const { destinationChain, destinationAsset, sourceAsset, srcLpAddress: lpAddress, address, amount, decimals, atomicContract, chainId } = params

        const timelock = calculateEpochTimelock(40);

        if (!account?.address) {
            throw Error("Wallet not connected")
        }
        if (isNaN(Number(chainId))) {
            throw Error("Invalid source chain")
        }
        if (!lpAddress) {
            throw Error("No LP address")
        }
        if (!atomicContract) {
            throw Error("No contract address")
        }

        const parsedAmount = ethers.utils.parseUnits(amount.toString(), decimals).toBigInt()

        const abi = sourceAsset.contract ? ERC20PHTLCAbi : PHTLCAbi

        function generateBytes32Hex() {
            const bytes = new Uint8Array(30);
            crypto.getRandomValues(bytes);

            // convert to hex
            let hex = Array.from(bytes)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            // pad with 2 extra bytes (4 hex chars)
            return '0000' + hex;
        }

        const id = `0x${generateBytes32Hex()}`;

        // Secret derivation for HTLC with hashlock
        const secret = await deriveSecret({
            chainId: Number(chainId),
            wallet: account.wallet,
            config,
            timelock
        });
        const hashlock = secretToHashlock(secret);

        // Note: Add hashlock to args array when contract supports it
        let simulationData: any = {
            account: account.address as `0x${string}`,
            abi: abi,
            address: atomicContract,
            functionName: 'commit',
            args: [
                [],
                [],
                [],
                destinationChain,
                destinationAsset,
                address,
                sourceAsset.symbol,
                id,
                lpAddress,
                timelock,
            ],
            chainId: Number(chainId),
        }

        if (sourceAsset.contract) {
            simulationData.args = [
                ...simulationData.args,
                parsedAmount as any,
                sourceAsset.contract
            ]
            const allowance = await readContract(config, {
                account: account.address as `0x${string}`,
                abi: IMTBLZKERC20,
                address: sourceAsset.contract as `0x${string}`,
                functionName: 'allowance',
                args: [account.address, atomicContract],
                chainId: Number(chainId),
            })

            if (Number(allowance) < parsedAmount) {
                const res = await writeContract(config, {
                    account: account.address as `0x${string}`,
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

        } else {
            simulationData.value = parsedAmount as any
        }

        const { request } = await simulateContract(config, simulationData)

        const hash = await writeContract(config, request)
        return { hash, commitId: id }
    }

    const getDetails = async (params: CommitmentParams): Promise<Commit> => {
        const { chainId, id, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const result: any = await readContract(config, {
            abi: abi,
            address: contractAddress as `0x${string}`,
            functionName: 'getHTLCDetails',
            args: [id],
            chainId: Number(chainId),
        })

        // const networkToken = networks.find(network => chainId && network.chainId == chainId)?.tokens.find(token => token.symbol === result.srcAsset)

        const parsedResult = {
            ...result,
            secret: (result.secret as any) != 1 ? BigInt(result.secret!) : undefined,
            hashlock: (result.hashlock == "0x0100000000000000000000000000000000000000000000000000000000000000" || result.hashlock == "0x0000000000000000000000000000000000000000000000000000000000000000") ? null : result.hashlock,
            sender: result.sender !== "0x0000000000000000000000000000000000000000" ? result.sender : undefined,
            amount: formatAmount(Number(result.amount), 18), //networkToken?.decimals
            timelock: Number(result.timelock)
        }

        if (!result) {
            throw new Error("No result")
        }
        return parsedResult
    }

    const secureGetDetails = async (params: CommitmentParams): Promise<Commit | null> => {
        const { chainId, id, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const network = networks.find(n => n.chainId === chainId)
        if (!network) throw new Error("No network found")

        // Get effective RPC URL (custom if configured, otherwise default)
        const nodeUrls = getEffectiveRpcUrls(network)
        if (!nodeUrls) throw new Error("No node urls found")

        const chain = resolveChain(network, nodeUrls[0]) as Chain

        async function getDetailsFetch(client: PublicClient): Promise<Commit> {
            const result: any = await client.readContract({
                abi: abi,
                address: contractAddress as `0x${string}`,
                functionName: 'getHTLCDetails',
                args: [id],
            })
            return result
        }

        // Create an array of PublicClients for each RPC endpoint
        const clients = nodeUrls.map((node) =>
            createPublicClient({ transport: http(node), chain })
        )

        // Fetch all results in parallel
        const results = await Promise.all(clients.map((client) => getDetailsFetch(client)))

        // Extract hashlocks
        const hashlocks = results.map(r => r.hashlock).filter(h => h !== "0x0100000000000000000000000000000000000000000000000000000000000000" && h !== "0x0000000000000000000000000000000000000000000000000000000000000000")

        if (!hashlocks.length) return null

        // Verify all hashlocks are the same
        const [firstHashlock, ...otherHashlocks] = hashlocks
        if (!otherHashlocks.every(h => h === firstHashlock)) {
            throw new Error('Hashlocks do not match across the provided nodes')
        }

        const parsedResult = {
            ...results[0],
            secret: (results[0].secret as any) != 1 ? BigInt(results[0].secret!) : undefined,
            timelock: Number(results[0].timelock)
        }

        // All hashlocks match, return one of the results (e.g., the first one)
        return parsedResult

    }

    const addLock = async (params: CommitmentParams & LockParams) => {
        const { chainId, id, hashlock, contractAddress, solver } = params

        const timelock = calculateEpochTimelock(20);

        const apiClient = new LayerSwapApiClient()

        const domain = {
            name: "Train",
            version: "1",
            chainId: Number(chainId),
            verifyingContract: contractAddress as `0x${string}`,
        };

        const types = {
            addLockMsg: [
                { name: "Id", type: "bytes32" },
                { name: "hashlock", type: "bytes32" },
                { name: "timelock", type: "uint48" },
            ],
        };

        const message = {
            Id: id,
            hashlock,
            timelock,
        };

        if (!account?.address) throw new Error("Wallet not connected")

        const signature = await signTypedData(config, {
            account: account.address as `0x${string}`,
            domain, types, message,
            primaryType: "addLockMsg"
        });

        const sig = ethers.utils.splitSignature(signature)

        try {
            await apiClient.AddLockSig({
                signature,
                v: sig.v.toString(),
                r: sig.r,
                s: sig.s,
                timelock,
            },
                id,
                solver
            )
        } catch (e) {
            throw new Error("Failed to add lock")
        }

        return { hash: signature, result: signature }
    }

    const refund = async (params: RefundParams) => {
        const { chainId, id, contractAddress, type } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi

        const { request } = await simulateContract(config, {
            abi: abi,
            address: contractAddress as `0x${string}`,
            functionName: 'refund',
            args: [id],
            chainId: Number(chainId),
        })

        const result = await writeContract(config, request)

        if (!result) {
            throw new Error("No result")
        }
        return result
    }

    const claim = async (params: ClaimParams) => {
        const { chainId, id, contractAddress, type, secret } = params
        const abi = type === 'erc20' ? ERC20PHTLCAbi : PHTLCAbi
        if (!evmAccount?.address) throw new Error("Wallet not connected")

        const bigIntSecret = BigInt(secret)

        const { request } = await simulateContract(config, {
            account: evmAccount.address as `0x${string}`,
            abi: abi,
            address: contractAddress as `0x${string}`,
            functionName: 'redeem',
            args: [id, bigIntSecret],
            chainId: Number(chainId),
        })

        const result = await writeContract(config, request)

        if (!result) {
            throw new Error("No result")
        }

        return result
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
