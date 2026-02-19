import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import { getNativeToken } from "@/Models/Network";
import { formatUnits } from "viem";
import KnownInternalNames from "@/lib/knownIds";
import { retryWithExponentialBackoff } from "@/lib/retry";

export class FuelBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.slug === KnownInternalNames.Networks.FuelMainnet || network.slug === KnownInternalNames.Networks.FuelTestnet
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, options) => {
        let balances: TokenBalance[] = []

        if (!network?.tokens) return

        const BALANCES_QUERY = `query Balances($filter: BalanceFilterInput) {
            balances(filter: $filter, first: 5) {
              nodes {
                amount
                assetId
              }
            }
          }`;

        const BALANCES_ARGS = {
            filter: {
                owner: address,
            },
        };

        try {
            const response = await retryWithExponentialBackoff(async () => await fetch(network.nodes?.[0]?.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    query: BALANCES_QUERY,
                    variables: BALANCES_ARGS,
                }),
            }), options?.retryCount ?? 3);

            const json: {
                data: {
                    balances: {
                        nodes: {
                            amount: string,
                            assetId: string
                        }[]
                    }
                }
            } = await response.json();

            const nativeToken = getNativeToken(network)

            for (let i = 0; i < network.tokens.length; i++) {
                const token = network.tokens[i]
                const balance = json.data.balances.nodes.find(b => b?.assetId === token.contractAddress) || null

                const balanceObj: TokenBalance = {
                    network: network.slug,
                    amount: balance?.amount ? Number(formatUnits(BigInt(Number(balance?.amount)), token.decimals)) : undefined,
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
