import { NetworkContract } from "@/Models/Network";
import TrainApiClient from "../lib/trainApiClient";
import { getThemeData } from "./settingsHelper";
import KnownInternalNames from "@/lib/knownIds";

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

    // Inject Starknet Sepolia if the API doesn't return it
    const hasStarknet = resolvedNetworks.some(n => n.caip2Id === KnownInternalNames.Networks.StarkNetSepolia)
    if (!hasStarknet) {
        const starknetMock = mockData.data.find(n => n.caip2Id === KnownInternalNames.Networks.StarkNetSepolia)
        resolvedNetworks.push({
            caip2Id: KnownInternalNames.Networks.StarkNetSepolia,
            displayName: "Starknet Sepolia",
            chainId: 'SN_SEPOLIA',
            nativeTokenAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
            type: { name: "starknet" },
            logoUrl: 'https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/starknet.png',
            tokens: [{
                symbol: "ETH",
                contractAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
                decimals: 18,
                priceInUsd: prices["eip155:11155111:0x0000000000000000000000000000000000000000"],
            }],
            nodes: starknetMock?.nodes ?? [],
            contracts: (starknetMock?.contracts as NetworkContract[]) ?? [],
            metadata: [],
        } as any)
    }

    // Inject Aztec testnet if the API doesn't return it
    const hasAztec = resolvedNetworks.some(n => n.caip2Id === KnownInternalNames.Networks.AztecDevnet)
    if (!hasAztec) {
        const aztecMock = mockData.data.find(n => n.caip2Id === KnownInternalNames.Networks.AztecDevnet)
        resolvedNetworks.push({
            caip2Id: KnownInternalNames.Networks.AztecDevnet,
            displayName: "Aztec Devnet",
            chainId: 'devnet',
            nativeTokenAddress: "0x02c31306cad429e0a00d3a4ee8ba251853099f835101ee2c637e9b3b9351a056",
            type: { name: "aztec" },
            logoUrl: 'https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/aztec.png',
            tokens: [{
                symbol: "ETH",
                contractAddress: "0x02c31306cad429e0a00d3a4ee8ba251853099f835101ee2c637e9b3b9351a056",
                decimals: 18,
                priceInUsd: prices["eip155:11155111:0x0000000000000000000000000000000000000000"],
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
            "caip2Id": KnownInternalNames.Networks.StarkNetSepolia,
            "nodes": [
                {
                    "providerName": "publicnode",
                    "url": "https://starknet-sepolia-rpc.publicnode.com",
                    "protocol": "Http"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "0x056d5aab86196192bbdb571116b69de5169453eaf3f164300de2616c184fd697"
                }
            ],
        },
        {
            "caip2Id": KnownInternalNames.Networks.AztecDevnet,
            "nodes": [
                {
                    "providerName": "aztec-devnet",
                    "url": "https://v4-devnet-2.aztec-labs.com"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "0x2b9192d4571cceb33c689f750bcf380a7baae350846cc55616a278523cfd0dfc"
                }
            ],
        }
    ]
}