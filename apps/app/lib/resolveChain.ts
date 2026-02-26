import { Chain } from "viem";
import { resolveChain as sdkResolveChain } from "@train-protocol/sdk";
import { Network, getNativeToken } from "../Models/Network";
import NetworkSettings from "./NetworkSettings";
import { SendErrorMessage } from "./telegram";
import { chainConfig } from 'viem/op-stack'

export default function resolveChain(network: Network, customRpcUrl?: string): Chain | undefined {
    const nativeToken = getNativeToken(network);

    if (!nativeToken?.symbol) {
        SendErrorMessage("UI Settings error", `env: ${process.env.NEXT_PUBLIC_VERCEL_ENV} %0A url: ${process.env.NEXT_PUBLIC_VERCEL_URL} %0A message: could not find native currency for ${network.caip2Id} ${JSON.stringify(network)} %0A`)
        return undefined
    }

    const feeConfig = {
        defaultPriorityFee: NetworkSettings.KnownSettings[network.caip2Id]?.DefaultPriorityFee,
        baseFeeMultiplier: NetworkSettings.KnownSettings[network.caip2Id]?.BaseFeeMultiplier ?? 1.2,
    }

    const chain = sdkResolveChain(network, customRpcUrl, feeConfig)
    if (!chain) return undefined

    // OP Stack overlay for Optimism mainnet
    if (Number(network.chainId) === 10) {
        Object.assign(chain, chainConfig)
    }

    return chain
}
