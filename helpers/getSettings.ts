import TrainApiClient from "../lib/trainApiClient";
import { getThemeData } from "./settingsHelper";

const apiClient = new TrainApiClient()

export async function getServerSideProps(context) {

    context.res.setHeader(
        'Cache-Control',
        's-maxage=60, stale-while-revalidate'
    );

    const networks = await apiClient.GetNetworksAsync()

    if (!networks.length) return

    const networksWithLogos = networks.map(network => ({
        ...network,
        logo: `https://github.com/TrainProtocol/icons/blob/standardize-caip2-names/networks/${network.displayName.toLowerCase().split(' ')[0]}.png?raw=true`,
        nodes: mockData.data.find(n => n.caip2Id === network.caip2Id)?.nodes ?? [],
    }))

    const settings = {
        networks: networksWithLogos,
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
            "type": {
                "name": "eip155",
                "displayName": "EVM",
                "nativeTokenAddress": "0x0000000000000000000000000000000000000000",
                "addressFormat": "hex",
                "addressLength": 20,
                "curve": "secp256k1"
            },
            "tokens": [
                {
                    "symbol": "ETH",
                    "contractAddress": "0x0000000000000000000000000000000000000000",
                    "priceInUsd": 1969,
                    "decimals": 18
                }
            ],
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
                    "address": "0x63B8b33f9b12296121eD0365Db178E400cC86384"
                },
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
            "metadata": [],
            "slug": "eth-sepolia",
            "displayName": "Ethereum Sepolia",
            "chainId": "11155111",
            "nativeTokenAddress": "0x0000000000000000000000000000000000000000"
        },
        {
            "caip2Id": "eip155:421614",
            "type": {
                "name": "eip155",
                "displayName": "EVM",
                "nativeTokenAddress": "0x0000000000000000000000000000000000000000",
                "addressFormat": "hex",
                "addressLength": 20,
                "curve": "secp256k1"
            },
            "tokens": [
                {
                    "symbol": "ETH",
                    "contractAddress": "0x0000000000000000000000000000000000000000",
                    "priceInUsd": 1969,
                    "decimals": 18
                }
            ],
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
                    "address": "0x0cb5a831bc95209995e9493e93648d3b64c27f16"
                },
                {
                    "type": "Multicall",
                    "address": "0xcA11bde05977b3631167028862bE2a173976CA11"
                }
            ],
            "metadata": [],
            "slug": "arb-sepolia",
            "displayName": "Arbitrum Sepolia",
            "chainId": "421614",
            "nativeTokenAddress": "0x0000000000000000000000000000000000000000"
        },
        {
            "caip2Id": "eip155:84532",
            "type": {
                "name": "eip155",
                "displayName": "EVM",
                "nativeTokenAddress": "0x0000000000000000000000000000000000000000",
                "addressFormat": "hex",
                "addressLength": 20,
                "curve": "secp256k1"
            },
            "tokens": [
                {
                    "symbol": "ETH",
                    "contractAddress": "0x0000000000000000000000000000000000000000",
                    "decimals": 18
                }
            ],
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
            "metadata": [],
            "slug": "base-sepolia",
            "displayName": "Base Sepolia",
            "chainId": "84532",
            "nativeTokenAddress": "0x0000000000000000000000000000000000000000"
        }
    ]
}