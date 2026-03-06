import { GasProps } from "../../../Models/Balance";
import { Network, getNativeToken, NetworkContractType } from "../../../Models/Network";
import { formatUnits } from "viem";

export class SolanaGasProvider {
    supportsNetwork(network: Network): boolean {
        return network.caip2Id.toLowerCase().startsWith('solana')
    }

    getGas = async ({ address, network, token }: GasProps) => {
        if (!address) return

        const atomicContract = network.contracts?.find(c => c.type === NetworkContractType.Train)?.address
        if (!atomicContract) return

        const nativeToken = getNativeToken(network)
        if (!nativeToken) return

        try {
            const lamports = await estimateSolanaGas({
                rpcUrl: network.nodes?.[0]?.url ?? '',
                contractAddress: atomicContract,
                address,
                tokenSymbol: token.symbol,
                tokenContractAddress: token.contractAddress,
                decimals: token.decimals ?? 6,
            })

            const gas = lamports ? Number(formatUnits(BigInt(lamports), nativeToken.decimals)) : undefined
            return gas !== undefined ? { gas, token: nativeToken } : undefined
        } catch (e) {
            console.error(e)
        }
    }
}

async function estimateSolanaGas(params: {
    rpcUrl: string
    contractAddress: string
    address: string
    tokenSymbol: string
    tokenContractAddress?: string | null
    decimals: number
}): Promise<number | undefined> {
    const { Connection, PublicKey } = await import('@solana/web3.js')
    const { AnchorProvider, Program } = await import('@coral-xyz/anchor')
    const { phtlcTransactionBuilder, TrainHtlc } = await import('@train-protocol/solana')

    const connection = new Connection(params.rpcUrl, 'confirmed')
    const walletPublicKey = new PublicKey(params.address)
    const wallet = {
        publicKey: walletPublicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any) => txs,
    }
    const provider = new AnchorProvider(connection, wallet as any, AnchorProvider.defaultOptions())
    const program = new Program(TrainHtlc(params.contractAddress), provider)

    const { transaction } = await phtlcTransactionBuilder({
        connection,
        program,
        walletPublicKey,
        hashlock: Buffer.alloc(32),
        sourceChain: 'solana',
        destinationChain: 'eip155:1',
        destinationAsset: 'ETH',
        destinationAddress: params.address,
        destinationAmount: '1',
        lpAddress: 'bD5zQpd6RkbNJDtW7cBf1mw6wHzFxZ71wPCMwAmMh6n',
        sourceAsset: { symbol: params.tokenSymbol, contractAddress: params.tokenContractAddress },
        amount: '1',
        decimals: params.decimals,
        timelockDelta: 69,
        quoteExpiry: Math.floor(Date.now() / 1000) + 3600,
        rewardAmount: '0',
        rewardToken: '',
        rewardRecipient: '',
        rewardTimelockDelta: 34,
    })

    const message = transaction.compileMessage()
    const result = await connection.getFeeForMessage(message)
    return result.value ?? undefined
}