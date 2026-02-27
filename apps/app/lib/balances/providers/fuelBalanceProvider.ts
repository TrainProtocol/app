import { BalanceProvider } from "@/apps/app/Models/BalanceProvider";
import { TokenBalance } from "@/apps/app/Models/Balance";
import { getNativeToken } from "@/apps/app/Models/Network";
import { formatUnits } from "viem";
import KnownInternalNames from "@/apps/app/lib/knownIds";
import { retryWithExponentialBackoff } from "@/apps/app/lib/retry";

export class FuelBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.caip2Id === KnownInternalNames.Networks.FuelMainnet || network.caip2Id === KnownInternalNames.Networks.FuelTestnet
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
                    network: network.caip2Id,
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
