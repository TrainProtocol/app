import { GasProps } from "../../../Models/Balance";
import { Network, getNativeToken, NetworkContractType } from "../../../Models/Network";
import { formatUnits } from "viem";
import { getNetworkRpcUrl } from "../../rpc/resolveNetworkRpcUrl";

const NATIVE_SOL_ADDRESS = '11111111111111111111111111111111'
const CONSTANT_PAYOUT_CURVE = 'Dp4ReoYGG8VRXpnst4vT8g6UDVwUicJwAuiikQWk8HMF'

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
                rpcUrl: getNetworkRpcUrl(network),
                contractAddress: atomicContract,
                address,
                sourceChain: network.caip2Id,
                tokenSymbol: token.symbol,
                tokenContractAddress: token.contract,
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
    sourceChain: string
    tokenSymbol: string
    tokenContractAddress?: string | null
    decimals: number
}): Promise<number | undefined> {
    const { SolanaHTLCWalletClient } = await import('@train-protocol/solana')
    const { Connection } = await import('@solana/web3.js')

    const client = new SolanaHTLCWalletClient({
        rpcUrl: params.rpcUrl,
        signer: {
            publicKey: params.address,
            signTransaction: async () => {
                throw new Error('Gas estimation signer cannot sign transactions')
            },
        },
    })

    const transaction = await client.buildUserLockTx({
        hashlock: '0x' + '00'.repeat(32),
        sourceChain: params.sourceChain,
        destinationChain: 'eip155:1',
        amount: '1',
        destinationAmount: '1',
        sourceAsset: {
            symbol: params.tokenSymbol,
            contract: params.tokenContractAddress ?? NATIVE_SOL_ADDRESS,
            decimals: params.decimals,
        },
        destinationAsset: {
            symbol: 'ETH',
            contract: '0x0000000000000000000000000000000000000000',
            decimals: 18,
        },
        srcSolverAddress: params.address,
        destSolverAddress: params.address,
        atomicContract: params.contractAddress,
        sourceAddress: params.address,
        destinationAddress: params.address,
        solverData: '0x00',
        payoutCurve: CONSTANT_PAYOUT_CURVE,
        payoutCurveData: '0x',
        quoteExpiry: Math.floor(Date.now() / 1000) + 3600,
        rewardAmount: '0',
        rewardToken: '',
        rewardRecipient: '',
        rewardTimelockDelta: 0,
        timelockDelta: 1200,
        nonce: 1,
    })

    const connection = new Connection(params.rpcUrl, 'confirmed')
    const result = await connection.getFeeForMessage(transaction.compileMessage())
    return result.value ?? undefined
}
