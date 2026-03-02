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

    // Inject Aztec testnet if the API doesn't return it
    const hasAztec = resolvedNetworks.some(n => n.caip2Id === "AZTEC_TESTNET")
    if (!hasAztec) {
        const aztecMock = mockData.data.find(n => n.caip2Id === "AZTEC_TESTNET")
        resolvedNetworks.push({
            caip2Id: "AZTEC_TESTNET",
            displayName: "Aztec Testnet",
            chainId: "AZTEC_TESTNET",
            nativeTokenAddress: "0x05c21c27f8bd1cacc9683d44f5a875a2dbfd62a455ab0b40e606dfe909c6363b",
            type: { name: "aztec" },
            tokens: [{
                symbol: "ETH",
                contractAddress: "0x05c21c27f8bd1cacc9683d44f5a875a2dbfd62a455ab0b40e606dfe909c6363b",
                decimals: 8,
            }],
            nodes: aztecMock?.nodes ?? [],
            contracts: (aztecMock?.contracts as NetworkContract[]) ?? [],
            metadata: [],
        } as any)
    }

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
                    "address": "0xed6e07caf602feb2d535267b06b24bc6cb457975"
                },
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
        },
        {
            "caip2Id": "AZTEC_TESTNET",
            "nodes": [
                {
                    "providerName": "aztec-devnet",
                    "url": "https://v4-devnet-2.aztec-labs.com"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "0x232b967fa55f8d71f1c0e7223cbca3269828d1c273f66de67924e3deb0e19416"
                }
            ],
        }
    ]
}