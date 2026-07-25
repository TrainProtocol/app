import { NetworkContract, NetworkContractType } from "@/Models/Network";
import { TrainSettings } from "@/Models/TrainSettings";
import { resolveNodes } from "@/lib/rpc/nodeResolver";
import { TrainApiClient } from "@train-protocol/sdk";
import { unstable_cache } from "next/cache";

if (!process.env.NEXT_PUBLIC_TRAIN_API)
    throw new Error("NEXT_PUBLIC_TRAIN_API not provided")

const apiClient = new TrainApiClient({
    baseUrl: process.env.NEXT_PUBLIC_TRAIN_API
})

export const getSettings = unstable_cache(
    async (): Promise<TrainSettings | null> => {
        const [networks, prices] = await Promise.all([
            apiClient.getNetworks(),
            apiClient.getPrices(),
        ])

        if (!networks.length) return null

        const resolvedNetworks = (await Promise.all(networks.map(async network => {
            const _network = Contracts.data.find(n => n.caip2Id === network.caip2Id)
            const resolvedNodes = await resolveNodes(network.caip2Id)
            const contracts: NetworkContract[] = [
                ...(_network?.contracts || []) as NetworkContract[],
                {
                    type: NetworkContractType.Train,
                    address: network.trainContract
                }
            ]

            return {
                ...network,
                nodes: resolvedNodes.map(n => ({ providerName: n.providerName, url: n.url })),
                contracts,
                tokens: network.tokens.map(token => ({
                    ...token,
                    priceInUsd: prices[`${network.caip2Id}:${token.contract}`] || 0,
                })),
            }
        }))).filter(n => n?.nodes?.length > 0)

        return {
            networks: resolvedNetworks,
        }
    },
    ["settings"],
    { revalidate: 60, tags: ["settings"] },
)

const Contracts = {
    "data": [
        {
            "caip2Id": "eip155:11155111",
            "contracts": [
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        },
        {
            "caip2Id": "eip155:421614",
            "contracts": [
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        },
        {
            "caip2Id": "eip155:84532",
            "contracts": [
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        },
        {
            "caip2Id": "eip155:42431",
            "contracts": [
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        }
    ]
}
