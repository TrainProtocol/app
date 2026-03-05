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
            const { SolanaHTLCClient } = await import("@train-protocol/solana")

            const client = new SolanaHTLCClient({
                rpcUrl: network.nodes?.[0]?.url ?? '',
            })

            const lamports = await client.estimateGas({
                contractAddress: atomicContract,
                address,
                tokenSymbol: token.symbol,
                tokenContractAddress: token.contractAddress,
                decimals: token.decimals ?? 6,
            })

            return lamports ? Number(formatUnits(BigInt(lamports), nativeToken.decimals)) : undefined
        } catch (e) {
            console.error(e)
        }
    }
}