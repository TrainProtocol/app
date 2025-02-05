import { Chain, defineChain, parseGwei } from "viem";
import { ContractType, Network } from "../Models/Network";
import NetworkSettings from "./NetworkSettings";
import { SendErrorMessage } from "./telegram";
import { chainConfig } from 'viem/op-stack'

export default function resolveChain(network: Network) {

    const nativeCurrency = network.native_token;
    const blockExplorersBaseURL =
        network.transaction_explorer_template ?
            new URL(network.transaction_explorer_template).origin
            : null

    const evm_multicall_contract  = network.contracts.find(c => c.type === ContractType.EvmMultiCallContract) || {}

    if (!nativeCurrency) {
        SendErrorMessage("UI Settings error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: could not find native currency for ${network.name} ${JSON.stringify(network)} %0A`)
        return
    }

    const opStackChainConfig = Number(network.chain_id) == 10 ? chainConfig : {}

    const res = defineChain({
        id: Number(network.chain_id),
        name: network.display_name,
        nativeCurrency: {
            name: nativeCurrency.symbol,
            symbol: nativeCurrency.symbol,
            decimals: nativeCurrency.decimals
        },
        rpcUrls: {
            default: {
                http: [network.nodes[0].url],
            },
            public: {
                http: [network.nodes[0].url],
            },
        },
        ...(blockExplorersBaseURL ? {
            blockExplorers: {
                default: {
                    name: 'name',
                    url: blockExplorersBaseURL,
                },
            }
        } : {}),
        contracts: {
            ...(evm_multicall_contract ? {
                multicall3: {
                    address: evm_multicall_contract as `0x${string}`
                }
            } : {}),
        },
        ...opStackChainConfig,
    })

    const defaultPriorityFee = NetworkSettings.KnownSettings[network.name]?.DefaultPriorityFee?.toString()
    const baseFeeMultiplier = NetworkSettings.KnownSettings[network.name]?.BaseFeeMultiplier ?? 1.2

    if (defaultPriorityFee) {
        res.fees = {
            ...res.fees,
            defaultPriorityFee: () => parseGwei(defaultPriorityFee),
        }
    }
    if (baseFeeMultiplier) {
        res.fees = {
            ...res.fees,
            baseFeeMultiplier: () => baseFeeMultiplier
        }
    }
    return res as Chain
}
