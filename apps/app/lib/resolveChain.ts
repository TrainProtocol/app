import { Chain, defineChain, parseGwei } from "viem";
import { Network, getNativeToken } from "../Models/Network";
import NetworkSettings from "./NetworkSettings";
import { SendErrorMessage } from "./telegram";
import { chainConfig } from 'viem/op-stack'
import { getNetworkRpcUrl } from "./rpc/resolveNetworkRpcUrl";

export default function resolveChain(network: Network, customRpcUrl?: string) {

    const nativeToken = getNativeToken(network);
    const nativeCurrency = nativeToken?.symbol;

    const evm_multicall_contract = network.contracts?.find(c => c.type === "Multicall")?.address || undefined

    if (!nativeCurrency || !nativeToken) {
        SendErrorMessage("UI Settings error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: could not find native currency for ${network.caip2Id} ${JSON.stringify(network)} %0A`)
        return
    }

    const opStackChainConfig = Number(network.chainId) == 10 ? chainConfig : {}

    // Use custom RPC URL if provided, otherwise use the network's effective RPC
    const rpcUrl = customRpcUrl || getNetworkRpcUrl(network);

    const res = defineChain({
        id: Number(network.chainId),
        name: network.displayName,
        nativeCurrency: {
            name: nativeCurrency,
            symbol: nativeCurrency,
            decimals: nativeToken.decimals
        },
        rpcUrls: {
            default: {
                http: [rpcUrl],
            },
            public: {
                http: [rpcUrl],
            },
        },
        contracts: {
            ...(evm_multicall_contract ? {
                multicall3: {
                    address: evm_multicall_contract as `0x${string}`
                }
            } : undefined),
        },
        ...opStackChainConfig,
    })

    const defaultPriorityFee = NetworkSettings.KnownSettings[network.caip2Id]?.DefaultPriorityFee?.toString()
    const baseFeeMultiplier = NetworkSettings.KnownSettings[network.caip2Id]?.BaseFeeMultiplier ?? 1.2

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