import {
    PublicClient,
    WalletClient,
    createPublicClient,
    http,
    zeroAddress,
    toHex,
    parseEventLogs,
    parseUnits,
    formatUnits
} from 'viem';
import { CreateHTLCParams, LockParams, RefundParams, ClaimParams } from '../../types/params';
import { LockDetails, LockStatus } from '../../types/lock';
import { AtomicResult, RecoveredSwapData } from '../../types/atomic';
import HTLCAbi from './abis/EVM_HTLC.json';
import ERC20Abi from './abis/ERC20.json';
import { IHTLCClient } from '../../types/htlc-client';

export interface EvmHTLCClientConfig {
    rpcUrl: string
    walletClient?: WalletClient
}

export class EvmHTLCClient implements IHTLCClient {
    private publicClient: PublicClient;
    private walletClient: WalletClient | undefined;

    constructor(config: EvmHTLCClientConfig) {
        this.publicClient = createPublicClient({ transport: http(config.rpcUrl) }) as PublicClient;
        this.walletClient = config.walletClient;
    }

    /**
     * Create an HTLC lock on source chain.
     * Caller must derive hashlock + nonce externally via the crypto module.
     */
    async createHTLC(
        params: CreateHTLCParams & { hashlock: string; nonce: number }
    ): Promise<AtomicResult> {
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
            chainId,
            quoteExpiry,
            rewardToken,
            rewardRecipient,
            rewardAmount,
            rewardTimelockDelta,
            solverData,
            destinationAmount,
            timelockDelta,
            hashlock,
            nonce: timestamp,
        } = params;

        if (!this.walletClient) throw new Error('WalletClient required for createHTLC');
        const parsedAmount = parseUnits(amount.toString(), decimals);

        const tokenAddress = sourceAsset.contractAddress
            ? (sourceAsset.contractAddress as `0x${string}`)
            : zeroAddress;

        const isNativeToken = !sourceAsset.contractAddress || sourceAsset.contractAddress === zeroAddress;

        // Handle ERC20 approval
        if (!isNativeToken && sourceAsset.contractAddress) {
            const allowance = await this.publicClient.readContract({
                abi: ERC20Abi,
                address: sourceAsset.contractAddress as `0x${string}`,
                functionName: 'allowance',
                args: [address as `0x${string}`, atomicContract as `0x${string}`],
            }) as bigint;

            if (allowance < parsedAmount) {
                const approveHash = await this.walletClient.writeContract({
                    abi: ERC20Abi,
                    address: sourceAsset.contractAddress as `0x${string}`,
                    functionName: 'approve',
                    args: [atomicContract as `0x${string}`, parsedAmount],
                    account: address as `0x${string}`,
                    chain: this.publicClient.chain,
                });
                await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
            }
        }

        const userLockParams = {
            hashlock,
            srcChain: sourceChain || '',
            amount: parsedAmount,
            timelockDelta,
            quoteExpiry,
            sender: address as `0x${string}`,
            recipient: lpAddress as `0x${string}`,
            token: tokenAddress,
            rewardAmount: rewardAmount || 0n,
            rewardToken: rewardToken ? rewardToken as `0x${string}` : zeroAddress,
            rewardRecipient: rewardRecipient ? rewardRecipient as `0x${string}` : zeroAddress,
            rewardTimelockDelta: rewardTimelockDelta ?? 0,
        };

        const destinationInfo = {
            dstChain: destinationChain,
            dstAddress: address,
            dstAmount: destinationAmount,
            dstToken: destinationAsset,
        };

        const userData = toHex(BigInt(timestamp), { size: 32 });

        const simulationData: any = {
            account: address as `0x${string}`,
            abi: HTLCAbi,
            address: atomicContract as `0x${string}`,
            functionName: 'userLock',
            args: [userLockParams, destinationInfo, userData, solverData],
            chain: this.publicClient.chain,
        };

        if (isNativeToken) {
            simulationData.value = parsedAmount;
        }

        const { request } = await this.publicClient.simulateContract(simulationData);
        const hash = await this.walletClient.writeContract(request as any);

        return { hash, hashlock, nonce: timestamp };
    }

    async getUserLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { id, contractAddress, txId } = params;

        const result: any = await this.publicClient.readContract({
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'getUserLock',
            args: [id],
        });

        const lockExists = result.sender !== zeroAddress;

        let userData: string | undefined;
        let blockTimestamp: number | undefined;

        if (lockExists && txId) {
            try {
                const receipt = await this.publicClient.getTransactionReceipt({
                    hash: txId as `0x${string}`,
                });
                const logs = parseEventLogs({
                    abi: HTLCAbi,
                    logs: receipt.logs,
                    eventName: 'UserLocked',
                }) as any[];
                const lockEvent = logs.find(log => log.args.hashlock === id);
                if (lockEvent?.args?.userData && lockEvent.args.userData !== '0x') {
                    userData = BigInt(lockEvent.args.userData).toString();
                }
                const block = await this.publicClient.getBlock({ blockNumber: receipt.blockNumber });
                blockTimestamp = Number(block.timestamp) * 1000;
            } catch (e) {
                console.error('Error fetching userData from tx receipt:', e);
            }
        }

        return {
            hashlock: lockExists ? id : undefined,
            amount: Number(formatUnits(BigInt(result.amount), 18)),
            secret: result.secret != 0n ? BigInt(result.secret) : undefined,
            sender: lockExists ? result.sender : undefined,
            recipient: result.recipient !== zeroAddress ? result.recipient : undefined,
            token: result.token !== zeroAddress ? result.token : undefined,
            timelock: Number(result.timelock),
            status: lockExists ? Number(result.status) as LockStatus : undefined,
            claimed: Number(result.status),
            userData,
            blockTimestamp,
        };
    }

    async getSolverLockDetails(params: LockParams): Promise<LockDetails | null> {
        const { id, contractAddress } = params;

        const count: any = await this.publicClient.readContract({
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'getSolverLockCount',
            args: [id],
        });

        if (Number(count) === 0) return null;

        const result: any = await this.publicClient.readContract({
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'getSolverLock',
            args: [id, 1],
        });

        const lockExists = result.sender !== zeroAddress;
        if (!lockExists) return null;

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(result.amount), params.decimals ?? 18)),
            secret: result.secret != 0n ? BigInt(result.secret) : undefined,
            sender: result.sender,
            recipient: result.recipient !== zeroAddress ? result.recipient : undefined,
            token: result.token !== zeroAddress ? result.token : undefined,
            timelock: Number(result.timelock),
            reward: Number(formatUnits(BigInt(result.reward), params.decimals ?? 18)),
            rewardTimelock: Number(result.rewardTimelock),
            rewardRecipient: result.rewardRecipient !== zeroAddress ? result.rewardRecipient : undefined,
            rewardToken: result.rewardToken !== zeroAddress ? result.rewardToken : undefined,
            status: Number(result.status) as LockStatus,
            claimed: Number(result.status),
            index: 0,
        };
    }

    /**
     * Multi-node consensus verification — queries multiple RPC nodes and verifies they agree.
     */
    async secureGetDetails(
        params: LockParams,
        nodeUrls: string[],
    ): Promise<LockDetails | null> {
        const { id, contractAddress } = params;

        const clients = nodeUrls.map(url =>
            createPublicClient({ transport: http(url) })
        );

        const results = await Promise.all(clients.map(client =>
            client.readContract({
                abi: HTLCAbi,
                address: contractAddress as `0x${string}`,
                functionName: 'getUserLock',
                args: [id],
            })
        ));

        const validResults = (results as any[]).filter(r => r.amount > 0n);
        if (!validResults.length) return null;

        const [firstResult, ...otherResults] = validResults;
        if (!otherResults.every(r => r.amount === firstResult.amount)) {
            throw new Error('Lock details do not match across the provided nodes');
        }

        return {
            hashlock: id,
            amount: Number(formatUnits(BigInt(firstResult.amount), params.decimals ?? 18)),
            secret: firstResult.secret != 0n ? BigInt(firstResult.secret) : undefined,
            sender: firstResult.sender !== zeroAddress ? firstResult.sender : undefined,
            recipient: firstResult.recipient !== zeroAddress ? firstResult.recipient : undefined,
            token: firstResult.token !== zeroAddress ? firstResult.token : undefined,
            timelock: Number(firstResult.timelock),
            status: Number(firstResult.status) as LockStatus,
            claimed: Number(firstResult.status),
            userData: firstResult.userData !== zeroAddress ? Number(firstResult.userData).toString() : undefined,
        };
    }

    async refund(params: RefundParams): Promise<string> {
        if (!this.walletClient) throw new Error('WalletClient required for refund');
        const { id, contractAddress } = params;

        const { request } = await this.publicClient.simulateContract({
            account: this.walletClient.account?.address as `0x${string}`,
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'refundUser',
            args: [id],
            chain: this.publicClient.chain,
        });

        return await this.walletClient.writeContract(request as any);
    }

    async claim(params: ClaimParams): Promise<string> {
        if (!this.walletClient) throw new Error('WalletClient required for claim');
        const { id, contractAddress, secret, destinationAddress } = params;

        const account = (destinationAddress ?? this.walletClient.account?.address) as `0x${string}`;

        const { request } = await this.publicClient.simulateContract({
            account,
            abi: HTLCAbi,
            address: contractAddress as `0x${string}`,
            functionName: 'redeemSolver',
            args: [id, 1, BigInt(secret)],
            chain: this.publicClient.chain,
        });

        return await this.walletClient.writeContract(request as any);
    }

    async recoverSwap(txHash: `0x${string}`): Promise<RecoveredSwapData> {
        const [receipt, tx] = await Promise.all([
            this.publicClient.getTransactionReceipt({ hash: txHash }),
            this.publicClient.getTransaction({ hash: txHash }),
        ]);

        const logs = parseEventLogs({
            abi: HTLCAbi,
            logs: receipt.logs,
            eventName: 'UserLocked',
        }) as any[];

        if (!logs.length) throw new Error('This transaction does not contain a swap lock');

        const args = logs[0].args;

        return {
            hashlock: args.hashlock,
            sender: args.sender,
            recipient: args.recipient,
            srcChain: args.srcChain,
            dstChain: args.dstChain,
            token: args.token,
            amount: args.amount,
            dstAddress: args.dstAddress,
            dstAmount: args.dstAmount,
            dstToken: args.dstToken,
            srcContract: tx.to as string,
        };
    }
}
