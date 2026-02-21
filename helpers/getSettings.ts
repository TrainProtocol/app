import { NetworkContract } from "@/Models/Network";
import TrainApiClient from "../lib/trainApiClient";
import { getThemeData } from "./settingsHelper";

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

    const resolvedNetworks = networks.map(network => {
        const _network = mockData.data.find(n => n.caip2Id === network.caip2Id)

        return {
            ...network,
            nodes: _network?.nodes ?? [],
            contracts: (_network?.contracts as NetworkContract[]) ?? [],
            tokens: network.tokens.map(token => ({
                ...token,
                priceInUsd: prices[`${network.caip2Id}:${token.contractAddress}`],
            })),
        }
    })

    const settings = {
        networks: resolvedNetworks,
    }

    const themeData = await getThemeData(context.query)

    return {
        props: { settings, themeData }
    }
}

const mockData = {
    "data": [
        {
            "caip2Id": "eip155:11155111",
            "nodes": [
                {
                    "providerName": "publicnode",
                    "url": "https://ethereum-sepolia-rpc.publicnode.com",
                    "protocol": "Http"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "0x9A0E4E619d391f6352E112cC4c452344a3EB4119"
                },
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        },
        {
            "caip2Id": "eip155:421614",
            "nodes": [
                {
                    "providerName": "publicnode",
                    "url": "https://arbitrum-sepolia-rpc.publicnode.com",
                    "protocol": "Http"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "0xcf6d47cdd0cb259e78262832b4db3f4f4f909dcb"
                },
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        },
        {
            "caip2Id": "eip155:84532",
            "nodes": [
                {
                    "providerName": "publicnode",
                    "url": "https://base-sepolia-rpc.publicnode.com",
                    "protocol": "Http"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "0x625d93f90829f2cfd0c0c88ec9a05694fcc1ca81"
                },
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        }
    ]
}