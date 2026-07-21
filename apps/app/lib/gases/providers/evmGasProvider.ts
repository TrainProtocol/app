import { GasProps } from "../../../Models/Balance"
import { ExtendedNetwork, getNativeToken, NetworkContractType } from "../../../Models/Network"
import { GasProvider } from "./types"
import { PublicClient, TransactionSerializedEIP1559, encodeFunctionData, serializeTransaction, zeroAddress, getContract, formatUnits } from "viem"
import HTLCAbi from "../../abis/atomic/EVM_HTLC.json"
import resolveChain from "../../resolveChain"
import {
    gasPriceOracleABI,
    gasPriceOracleAddress
} from '@eth-optimism/contracts-ts'
import { buildNetworkTransport } from "../../rpc/resolveNetworkRpcUrl"

const ERC20_TRANSFER_FROM_GAS_BUFFER = 65_000n

export class EVMGasProvider implements GasProvider {
    supportsNetwork(network: ExtendedNetwork): boolean {
        return network.networkType === "eip155" && !!getNativeToken(network)
    }

    getGas = async ({ address, network, token }: GasProps) => {
        const chainId = Number(network?.chainId)

        if (!network || !address || !chainId) {
            return
        }

        const atomicContract = network.contracts?.find(c => c.type === NetworkContractType.Train)?.address as `0x${string}` | undefined
        if (!atomicContract) return

        try {
            const { createPublicClient } = await import("viem")
            const chain = resolveChain(network)
            if (!chain) return

            const publicClient = createPublicClient({
                chain,
                transport: buildNetworkTransport(network),
            })

            const nativeToken = getNativeToken(network)
            if (!nativeToken) return

            const isERC20 = !!token?.contract && token.contract !== zeroAddress && token.contract !== network.nativeTokenAddress

            const isOpStack = network.contracts?.some(c => c.type === ("GasPriceOracle" as any))
            const calculator = isOpStack
                ? new OptimismGasCalculator(publicClient, chainId, address as `0x${string}`, network, atomicContract, nativeToken.decimals)
                : new EthereumGasCalculator(publicClient, chainId, address as `0x${string}`, network, atomicContract, nativeToken.decimals)

            const gas = await calculator.resolveGas(isERC20)
            if (gas === undefined) return

            return { gas, token: nativeToken }
        }
        catch (e) {
            console.error(e)
        }
    }
}

class EthereumGasCalculator {
    protected publicClient: PublicClient
    protected chainId: number
    protected account: `0x${string}`
    protected network: ExtendedNetwork
    protected atomicContract: `0x${string}`
    protected nativeTokenDecimals: number

    constructor(
        publicClient: PublicClient,
        chainId: number,
        account: `0x${string}`,
        network: ExtendedNetwork,
        atomicContract: `0x${string}`,
        nativeTokenDecimals: number,
    ) {
        this.publicClient = publicClient
        this.chainId = chainId
        this.account = account
        this.network = network
        this.atomicContract = atomicContract
        this.nativeTokenDecimals = nativeTokenDecimals
    }

    async resolveGas(isERC20: boolean): Promise<number | undefined> {
        const feeData = await this.resolveFeeData()
        const gasLimit = await this.estimateUserLockGas()

        if (!gasLimit) return undefined

        const totalGasLimit = isERC20 ? gasLimit + ERC20_TRANSFER_FROM_GAS_BUFFER : gasLimit
        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier) return undefined

        const totalGas = multiplier * totalGasLimit
        return Number(formatUnits(totalGas, this.nativeTokenDecimals))
    }

    protected encodeUserLockCallData() {
        const payoutCurve = this.network.contracts?.find(
            contract => contract.type === NetworkContractType.ConstantPayoutCurve,
        )?.address ?? zeroAddress

        return encodeFunctionData({
            abi: HTLCAbi,
            functionName: 'userLock',
            args: [
                {
                    hashlock: ('0x' + '00'.repeat(32)) as `0x${string}`,
                    amount: 1n,
                    rewardAmount: 0n,
                    timelockDelta: 1200,
                    rewardTimelockDelta: 0,
                    quoteExpiry: Math.floor(Date.now() / 1000) + 3600,
                    recipient: this.account,
                    refundTo: this.account,
                    token: zeroAddress,
                    payoutCurve,
                    payoutCurveData: '0x',
                    rewardToken: '',
                    rewardRecipient: '',
                    srcChain: this.network.caip2Id || 'eip155:1',
                },
                {
                    dstChain: 'eip155:1',
                    dstAddress: this.account,
                    dstAmount: 1n,
                    dstToken: 'ETH',
                },
                '0x',
                '0x',
            ],
        })
    }

    protected async estimateUserLockGas(): Promise<bigint | undefined> {
        try {
            const callData = this.encodeUserLockCallData()

            return await this.publicClient.estimateGas({
                account: this.account,
                to: this.atomicContract,
                data: callData,
                value: 1n,
            })
        } catch (e) {
            console.error('Gas estimation for userLock failed:', e)
            return undefined
        }
    }

    protected async resolveFeeData() {
        const gasPrice = await this.getGasPrice()
        const feesPerGas = await this.estimateFeesPerGas()

        return {
            gasPrice,
            maxFeePerGas: feesPerGas?.maxFeePerGas,
        }
    }

    private async getGasPrice() {
        try {
            return await this.publicClient.getGasPrice()
        } catch (e) {
            console.error('GasPriceError:', e)
        }
    }

    private async estimateFeesPerGas() {
        try {
            return await this.publicClient.estimateFeesPerGas()
        } catch (e) {
            console.error('FeesPerGasError:', e)
        }
    }
}

class OptimismGasCalculator extends EthereumGasCalculator {
    async resolveGas(isERC20: boolean): Promise<number | undefined> {
        const feeData = await this.resolveFeeData()
        const gasLimit = await this.estimateUserLockGas()

        if (!gasLimit) return undefined

        const totalGasLimit = isERC20 ? gasLimit + ERC20_TRANSFER_FROM_GAS_BUFFER : gasLimit
        const multiplier = feeData.gasPrice

        if (!multiplier) return undefined

        const l1Fee = await this.getL1Fee()
        const totalGas = (multiplier * totalGasLimit) + l1Fee

        return Number(formatUnits(totalGas, this.nativeTokenDecimals))
    }

    private async getL1Fee(): Promise<bigint> {
        try {
            const callData = this.encodeUserLockCallData()

            const serializedTransaction = serializeTransaction({
                chainId: this.chainId,
                to: this.atomicContract,
                data: callData,
                type: 'eip1559',
            }) as TransactionSerializedEIP1559

            const oracleContract = this.network.contracts?.find(c => c.type === ("GasPriceOracle" as any))?.address as `0x${string}` | undefined

            if (!oracleContract) return 0n

            const contract = getContract({
                address: oracleContract || gasPriceOracleAddress['420'],
                abi: gasPriceOracleABI,
                client: this.publicClient,
            })

            return await contract.read.getL1Fee([serializedTransaction])
        } catch (e) {
            console.error('L1 fee estimation failed:', e)
            return 0n
        }
    }
}
