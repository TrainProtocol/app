
import { GasProps } from "../../../Models/Balance"
import { Network, Token, ContractType } from "../../../Models/Network"
import { Provider } from "./types"
import { PublicClient, TransactionSerializedEIP1559, encodeFunctionData, serializeTransaction } from "viem";
import { erc20Abi } from "viem";
import { datadogRum } from "@datadog/browser-rum";
import formatAmount from "../../formatAmount";
import EVM_ERC20PHTLC from "../../abis/atomic/EVMERC20_PHTLC.json";
import EVM_PHTLC from "../../abis/atomic/EVM_PHTLC.json";
import { ethers } from "ethers";

export class EVMGasProvider implements Provider {
    supportsNetwork(network: Network): boolean {
        return network.group.toLowerCase().includes('evm') && !!network.native_token
    }

    getGas = async ({ address, network, token, recipientAddress = '0x2fc617e933a52713247ce25730f6695920b3befe', contractMethod }: GasProps) => {

        const chainId = Number(network?.chain_id)

        if (!network || !address || !chainId || !recipientAddress) {
            return
        }

        try {

            if (network.contracts.some(c => c.type === ContractType.ZksPaymasterContract)) return 0

            const { createPublicClient, http } = await import("viem")
            const resolveNetworkChain = (await import("../../resolveChain")).default
            const publicClient = createPublicClient({
                chain: resolveNetworkChain(network),
                transport: http(network.nodes[0].url),
            })
            const atomicContract = network.contracts.find(c => token.contract ? c.type === ContractType.HTLCTokenContractAddress : c.type === ContractType.HTLCNativeContractAddress)?.address as `0x${string}`

            const getGas = network?.contracts.some(c => c.type === ContractType.GasPriceOracleContract) ? getOptimismGas : getEthereumGas

            const gasProvider = new getGas(
                {
                    publicClient,
                    chainId,
                    account: address,
                    from: network,
                    currency: token,
                    destination: atomicContract,
                    nativeToken: network.native_token
                }
            )

            const gas = await gasProvider.resolveGas(contractMethod)

            return gas
        }
        catch (e) {
            console.log(e)
        }

    }
}


abstract class getEVMGas {

    protected publicClient: PublicClient
    protected chainId: number
    protected account: `0x${string}`
    protected from: Network
    protected currency: Token
    protected destination: `0x${string}`
    protected nativeToken: Token
    constructor(
        {
            publicClient,
            chainId,
            account,
            from,
            currency,
            destination,
            nativeToken,
        }: {
            publicClient: PublicClient,
            chainId: number,
            account: `0x${string}`,
            from: Network,
            currency: Token,
            destination: `0x${string}`,
            nativeToken: Token,
        }
    ) {
        this.publicClient = publicClient
        this.chainId = chainId
        this.account = account
        this.from = from
        this.currency = currency
        this.destination = destination
        this.nativeToken = nativeToken
    }

    abstract resolveGas(contractMethod?: 'commit' | 'addLock'): Promise<number | undefined>

    protected async resolveFeeData() {

        let gasPrice = await this.getGasPrice();
        let feesPerGas = await this.estimateFeesPerGas()
        let maxPriorityFeePerGas = feesPerGas?.maxPriorityFeePerGas
        if (!maxPriorityFeePerGas) maxPriorityFeePerGas = await this.estimateMaxPriorityFeePerGas()

        return {
            gasPrice,
            maxFeePerGas: feesPerGas?.maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas
        }

    }

    private async getGasPrice() {
        try {
            return await this.publicClient.getGasPrice()

        } catch (e) {
            const error = new Error(e)
            error.name = "GasPriceError"
            error.cause = e
            datadogRum.addError(error);
        }
    }
    private async estimateFeesPerGas() {
        try {
            return await this.publicClient.estimateFeesPerGas()

        } catch (e) {
            const error = new Error(e)
            error.name = "FeesPerGasError"
            error.cause = e
            datadogRum.addError(error);
        }
    }
    private async estimateMaxPriorityFeePerGas() {
        try {
            return await this.publicClient.estimateMaxPriorityFeePerGas()

        } catch (e) {
            const error = new Error(e)
            error.name = "MaxPriorityFeePerGasError"
            error.cause = e
            datadogRum.addError(error);
        }
    }

    protected async estimateNativeGasLimit(contractMethod?: 'commit' | 'addLock') {

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Date.now() + LOCK_TIME
        const timeLock = Math.floor(timeLockMS / 1000)

        const contract = getContract({
            address: this.destination,
            abi: EVM_PHTLC,
            client: this.publicClient,
        })

        function generateBytes32Hex() {
            const bytes = new Uint8Array(32); // 32 bytes = 64 hex characters
            crypto.getRandomValues(bytes);
            return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const id = `0x${generateBytes32Hex()}`;

        if (contractMethod === 'addLock') {
            const gasEstimate = await contract.estimateGas.addLock([
                [],
                [],
                [],
                'ETHEREUM_SEPOLIA',
                "ETH",
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                "ETH",
                id,
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                timeLock
            ], {
                account: this.account,
                value: ethers.utils.parseUnits(0.00005.toString(), 18).toBigInt()
            })

            return gasEstimate
        } else {
            const gasEstimate = await contract.estimateGas.commit([
                [],
                [],
                [],
                'ETHEREUM_SEPOLIA',
                "ETH",
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                "ETH",
                id,
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                timeLock
            ], {
                account: this.account,
                value: ethers.utils.parseUnits(0.00005.toString(), 18).toBigInt()
            })

            return gasEstimate
        }

    }

    protected async estimateERC20GasLimit(contractMethod?: 'commit' | 'addLock') {

        const LOCK_TIME = 1000 * 60 * 20 // 20 minutes
        const timeLockMS = Date.now() + LOCK_TIME
        const timeLock = Math.floor(timeLockMS / 1000)

        const contract = getContract({
            address: this.destination,
            abi: EVM_ERC20PHTLC,
            client: this.publicClient,
        })

        function generateBytes32Hex() {
            const bytes = new Uint8Array(32); // 32 bytes = 64 hex characters
            crypto.getRandomValues(bytes);
            return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        }

        const id = `0x${generateBytes32Hex()}`;

        if (contractMethod === 'addLock') {
            const gasEstimate = await contract.estimateGas.addLock([
                [],
                [],
                [],
                'ETHEREUM_SEPOLIA',
                "ETH",
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                "ETH",
                id,
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                timeLock
            ], {
                account: this.account,
                value: ethers.utils.parseUnits(0.00005.toString(), 18).toBigInt()
            })

            return gasEstimate
        } else {
            const gasEstimate = await contract.estimateGas.commit([
                [],
                [],
                [],
                'ETHEREUM_SEPOLIA',
                "ETH",
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                "ETH",
                id,
                "0x2fc617e933a52713247ce25730f6695920b3befe",
                timeLock
            ], {
                account: this.account,
                value: ethers.utils.parseUnits(0.00005.toString(), 18).toBigInt()
            })

            return gasEstimate
        }


    }

    protected constructSweeplessTxData = (txData: string = "0x") => {
        const hexed_sequence_number = (99999999).toString(16)
        const sequence_number_even = hexed_sequence_number?.length % 2 > 0 ? `0${hexed_sequence_number}` : hexed_sequence_number
        return `${txData}${sequence_number_even}` as `0x${string}`;
    }

}


class getEthereumGas extends getEVMGas {
    resolveGas = async (contractMethod?: 'commit' | 'addLock') => {
        const feeData = await this.resolveFeeData()

        const estimatedGasLimit = this.currency.contract
            ? await this.estimateERC20GasLimit(contractMethod)
            : await this.estimateNativeGasLimit(contractMethod)

        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier)
            return undefined

        const totalGas = multiplier * estimatedGasLimit

        const formattedGas = formatAmount(totalGas, this.nativeToken?.decimals)

        return formattedGas
    }

}


export default class getOptimismGas extends getEVMGas {
    resolveGas = async (contractMethod?: 'commit' | 'addLock') => {
        const feeData = await this.resolveFeeData()

        const estimatedGasLimit = this.currency.contract ?
            await this.estimateERC20GasLimit(contractMethod)
            : await this.estimateNativeGasLimit(contractMethod)

        const multiplier = feeData.maxFeePerGas || feeData.gasPrice

        if (!multiplier)
            return undefined

        let totalGas = (multiplier * estimatedGasLimit) + await this.GetOpL1Fee()

        const formattedGas = formatAmount(totalGas, this.nativeToken?.decimals)
        return formattedGas
    }

    private GetOpL1Fee = async (): Promise<bigint> => {
        const amount = BigInt(1000)
        let serializedTransaction: TransactionSerializedEIP1559

        if (this.currency.contract) {
            let encodedData = encodeFunctionData({
                abi: erc20Abi,
                functionName: "transfer",
                args: [this.destination, amount]
            })

            if (encodedData) {
                encodedData = this.constructSweeplessTxData(encodedData)
            }

            serializedTransaction = serializeTransaction({
                client: this.publicClient,
                abi: erc20Abi,
                functionName: "transfer",
                chainId: this.chainId,
                args: [this.destination, amount],
                to: this.currency.contract as `0x${string}`,
                data: encodedData,
                type: 'eip1559',
            }) as TransactionSerializedEIP1559
        }
        else {
            serializedTransaction = serializeTransaction({
                client: this.publicClient,
                chainId: this.chainId,
                to: this.destination,
                data: this.constructSweeplessTxData(),
                type: 'eip1559',
            }) as TransactionSerializedEIP1559
        }

        const oracleContract = this.from.contracts.find(c => c.type === ContractType.GasPriceOracleContract)!.address as `0x${string}`

        if (!oracleContract) throw new Error("No oracle contract")

        const fee = await getL1Fee({
            data: serializedTransaction,
            client: this.publicClient,
            oracleContract
        })

        return fee;
    }

}

//from https://github.com/ethereum-optimism/optimism/blob/develop/packages/fee-estimation/src/estimateFees.ts
import {
    gasPriceOracleABI,
    gasPriceOracleAddress,
} from '@eth-optimism/contracts-ts'
import {
    getContract,
    BlockTag,
} from 'viem'

/**
 * Options to query a specific block
 */
type BlockOptions = {
    /**
     * Block number to query from
     */
    blockNumber?: bigint
    /**
     * Block tag to query from
     */
    blockTag?: BlockTag
}

/**
 * Get gas price Oracle contract
 */
const getGasPriceOracleContract = (client: PublicClient, oracleContract?: `0x${string}` | null) => {
    return getContract({
        address: oracleContract || gasPriceOracleAddress['420'],
        abi: gasPriceOracleABI,
        client
    })
}

/**
 * Computes the L1 portion of the fee based on the size of the rlp encoded input
 * transaction, the current L1 base fee, and the various dynamic parameters.
 * @example
 * const L1FeeValue = await getL1Fee(data, params);
 */
const getL1Fee = async (options: { data: `0x02${string}`, client: PublicClient, oracleContract: `0x${string}` | null | undefined } & BlockOptions) => {
    const contract = getGasPriceOracleContract(options.client, options.oracleContract)
    return contract.read.getL1Fee([options.data], {
        blockNumber: options.blockNumber,
        blockTag: options.blockTag,
    })
}
