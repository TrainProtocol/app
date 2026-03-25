import { NetworkContract } from "@/Models/Network";
import TrainApiClient from "../lib/trainApiClient";
import KnownInternalNames from "@/lib/knownIds";
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
        const _network = mockData.data.find(n => n.caip2Id === network.caip2Id)
        const seedNodes = _network?.nodes ?? []
        const resolvedNodes = await resolveNodes(network.caip2Id, seedNodes)

        return {
            ...network,
            nodes: resolvedNodes.map(n => ({ providerName: n.providerName, url: n.url })),
            contracts: (_network?.contracts as NetworkContract[]) ?? [],
            tokens: network.tokens.map(token => ({
                ...token,
                priceInUsd: prices[`${network.caip2Id}:${token.contractAddress}`] || 0,
            })),
        }
    }))).filter(n => n?.nodes?.length > 0 && n?.contracts?.length > 0)

    const settings = {
        networks: resolvedNetworks,
    }

    return {
        props: { settings }
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
                    "url": "https://rpc.testnet.aztec-labs.com"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "0x2b9192d4571cceb33c689f750bcf380a7baae350846cc55616a278523cfd0dfc"
                }
            ],
        },
        {
            "caip2Id": KnownInternalNames.Networks.SolanaDevnet,
            "nodes": [
                {
                    "providerName": "solana-devnet",
                    "url": "https://api.devnet.solana.com",
                    "protocol": "Http"
                }
            ],
            "contracts": [
                {
                    "type": "Train",
                    "address": "ADwgQuJzWCrxEgsBR5EwGmvqD12xLbAW316KG8L2f8BL"
                }
            ],
        }
    ]
}

const MOCK_API_NETWORKS = [
    {
        caip2Id: "eip155:11155111",
        displayName: "Ethereum Sepolia",
        chainId: "11155111",
        nativeTokenAddress: "0x0000000000000000000000000000000000000000",
        type: { name: "eip155" },
        logoUrl: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        explorerUrlTemplate: {
            transaction: "https://sepolia.etherscan.io/tx/{hash}",
            address: "https://sepolia.etherscan.io/address/{address}",
        },
        tokens: [{
            symbol: "ETH",
            contractAddress: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        }],
        metadata: [],
    },
    {
        caip2Id: "eip155:421614",
        displayName: "Arbitrum Sepolia",
        chainId: "421614",
        nativeTokenAddress: "0x0000000000000000000000000000000000000000",
        type: { name: "eip155" },
        logoUrl: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
        explorerUrlTemplate: {
            transaction: "https://sepolia.arbiscan.io/tx/{hash}",
            address: "https://sepolia.arbiscan.io/address/{address}",
        },
        tokens: [{
            symbol: "ETH",
            contractAddress: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        }],
        metadata: [],
    },
    {
        caip2Id: "eip155:84532",
        displayName: "Base Sepolia",
        chainId: "84532",
        nativeTokenAddress: "0x0000000000000000000000000000000000000000",
        type: { name: "eip155" },
        logoUrl: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png",
        explorerUrlTemplate: {
            transaction: "https://sepolia.basescan.org/tx/{hash}",
            address: "https://sepolia.basescan.org/address/{address}",
        },
        tokens: [{
            symbol: "ETH",
            contractAddress: "0x0000000000000000000000000000000000000000",
            decimals: 18,
            logo: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        }],
        metadata: [],
    },
    {
        caip2Id: KnownInternalNames.Networks.StarkNetSepolia,
        displayName: "Starknet Sepolia",
        chainId: "SN_SEPOLIA",
        nativeTokenAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
        type: { name: "starknet" },
        logoUrl: "https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/starknet.png",
        tokens: [{
            symbol: "ETH",
            contractAddress: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
            decimals: 18,
        }],
        metadata: [],
    },
    {
        caip2Id: KnownInternalNames.Networks.AztecDevnet,
        displayName: "Aztec Devnet",
        chainId: "devnet",
        nativeTokenAddress: "0x02c31306cad429e0a00d3a4ee8ba251853099f835101ee2c637e9b3b9351a056",
        type: { name: "aztec" },
        logoUrl: "https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/aztec.png",
        tokens: [{
            symbol: "ETH",
            contractAddress: "0x02c31306cad429e0a00d3a4ee8ba251853099f835101ee2c637e9b3b9351a056",
            decimals: 18,
        }],
        metadata: [],
    },
    {
        caip2Id: KnownInternalNames.Networks.SolanaDevnet,
        displayName: "Solana Devnet",
        chainId: "devnet",
        nativeTokenAddress: "11111111111111111111111111111111",
        type: { name: "solana" },
        logoUrl: "https://raw.githubusercontent.com/TrainProtocol/icons/main/networks/solana.png",
        tokens: [{
            symbol: "SOL",
            contractAddress: "11111111111111111111111111111111",
            decimals: 9,
        }],
        metadata: [],
    },
]