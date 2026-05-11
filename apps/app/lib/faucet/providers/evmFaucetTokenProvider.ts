import { erc20Abi } from "viem"
import { getConnections, readContract, switchChain, watchAsset, type Config } from "@wagmi/core"
import { Network, NetworkTypes } from "@/Models/Network"
import type { AddToWalletArgs, FaucetTokenProvider } from "./types"

function toAbsoluteUrl(url: string | undefined): string | undefined {
    if (!url) return undefined
    if (typeof window === "undefined") return url
    try {
        return new URL(url, window.location.origin).toString()
    } catch {
        return undefined
    }
}

export class EVMFaucetTokenProvider implements FaucetTokenProvider {
    constructor(private config: Config) {}

    supportsNetwork(network: Network): boolean {
        return network.networkType === NetworkTypes.EVM
    }

    async addToWallet({ network, token, recipient }: AddToWalletArgs): Promise<boolean> {
        const connections = getConnections(this.config)
        const recipientLower = recipient.toLowerCase()
        const matched = connections.find(c => c.accounts.some(a => a.toLowerCase() === recipientLower))
        const connector = matched?.connector ?? connections[0]?.connector
        if (!connector) throw new Error("No EVM wallet connected")

        const chainId = Number(network.chainId)
        const address = token.contract as `0x${string}`

        const [symbol, decimals] = await Promise.all([
            readContract(this.config, { address, abi: erc20Abi, functionName: "symbol", chainId }),
            readContract(this.config, { address, abi: erc20Abi, functionName: "decimals", chainId }),
        ])

        await switchChain(this.config, { chainId, connector })

        return await watchAsset(this.config, {
            type: "ERC20",
            options: {
                address,
                symbol,
                decimals,
                image: toAbsoluteUrl(token.logoUrl),
            },
            connector,
        })
    }
}
