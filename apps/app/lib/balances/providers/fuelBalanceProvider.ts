import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import { getNativeToken } from "@/Models/Network";
import { formatUnits } from "viem";
import { retryWithExponentialBackoff } from "@/lib/retry";
import { NetworkTypes } from "@/Models/Network";
import { Provider } from "fuels";

export class FuelBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.networkType === NetworkTypes.Fuel
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        let balances: TokenBalance[] = []

        if (!network?.tokens) return

        try {
            const rpcUrl = network.nodes?.[0]?.url
            if (!rpcUrl) throw new Error(`No Fuel RPC configured for ${network.caip2Id}`)

            const provider = new Provider(rpcUrl)
            const { balances: fuelBalances } = await retryWithExponentialBackoff(
                () => provider.getBalances(address),
                options?.retryCount ?? 3,
            )

            const nativeToken = getNativeToken(network)

            for (let i = 0; i < network.tokens.length; i++) {
                const token = network.tokens[i]
                const balance = fuelBalances.find(b =>
                    b.assetId.toLowerCase() === token.contract.toLowerCase()
                )

                const balanceObj: TokenBalance = {
                    network: network.caip2Id,
                    amount: balance?.amount
                        ? Number(formatUnits(BigInt(balance.amount.toString()), token.decimals))
                        : undefined,
                    decimals: token.decimals,
                    isNativeCurrency: nativeToken?.symbol === token.symbol,
                    token: token.symbol,
                    request_time: new Date().toJSON()
                }

                balances.push(balanceObj)
            }

        } catch (e) {
            throw e
        }

        return balances
    }
}
