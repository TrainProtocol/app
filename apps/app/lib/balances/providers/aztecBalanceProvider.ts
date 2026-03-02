import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import KnownInternalNames from "@/lib/knownIds";

export class AztecBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.caip2Id === KnownInternalNames.Networks.AztecTestnet
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        if (!address || !network?.tokens) return []

        const { getPublicTokenBalance } = await import("@train-protocol/sdk-aztec")
        const nodeUrl = network.nodes?.[0]?.url
        if (!nodeUrl) return []

        const balances: TokenBalance[] = []

        for (const token of network.tokens) {
            try {
                const raw = await getPublicTokenBalance(nodeUrl, token.contractAddress, address)
                const divisor = 10 ** token.decimals
                const amount = Number(raw) / divisor

                balances.push({
                    network: network.caip2Id,
                    token: token.symbol,
                    amount,
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: token.contractAddress === network.nativeTokenAddress,
                })
            } catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e as Error, token, network))
            }
        }

        return balances
    }
}
