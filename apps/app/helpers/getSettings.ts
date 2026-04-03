import { NetworkContract, NetworkContractType } from "@/Models/Network";
import TrainApiClient from "../lib/trainApiClient";
import { resolveNodes } from "@/lib/rpc/nodeResolver";

const apiClient = new TrainApiClient()

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const [networks, prices] = await Promise.all([
        apiClient.GetNetworksAsync(),
        apiClient.GetPricesAsync(),
    ])

    if (!networks.length) return

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

    const settings = {
        networks: resolvedNetworks,
    }

    return {
        props: { settings }
    }
}

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
        }
    ]
}