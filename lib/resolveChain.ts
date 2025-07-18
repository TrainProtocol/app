import { Chain, defineChain, parseGwei } from "viem";
import { ContractType, Network } from "../Models/Network";
import NetworkSettings from "./NetworkSettings";
import { SendErrorMessage } from "./telegram";
import { chainConfig } from 'viem/op-stack'

export default function resolveChain(network: Network) {

    const nativeCurrency = network.nativeTokenSymbol;
    const blockExplorersBaseURL =
        network.transactionExplorerTemplate ?
            new URL(network.transactionExplorerTemplate).origin
            : null

    const evm_multicall_contract = network.contracts?.find(c => c.type === ContractType.EvmMultiCallContract)?.address || undefined

    if (!nativeCurrency) {
        SendErrorMessage("UI Settings error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: could not find native currency for ${network.name} ${JSON.stringify(network)} %0A`)
        return
    }

    const opStackChainConfig = Number(network.chainId) == 10 ? chainConfig : {}

    const res = defineChain({
        id: Number(network.chainId),
        name: network.displayName,
        nativeCurrency: {
            name: nativeCurrency,
            symbol: nativeCurrency,
            decimals: network.nativeTokenDecimals
        },
        rpcUrls: {
            default: {
                http: [network.rpcUrl],
            },
            public: {
                http: [network.rpcUrl],
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
            } : undefined),
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
