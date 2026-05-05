import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import KnownInternalNames from "@/lib/knownIds";
import { formatUnits } from "viem";
import { getNetworkRpcUrl } from "@/lib/rpc/resolveNetworkRpcUrl";

// Storage slot for public_balances map in the Token contract (slot 9 for standard Aztec token)
const TOKEN_PUBLIC_BALANCES_SLOT_INDEX = 9n

export class AztecBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.caip2Id === KnownInternalNames.Networks.AztecTestnet
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        if (!address || !network?.tokens) return []

        const nodeUrl = getNetworkRpcUrl(network)
        if (!nodeUrl) return []

        // Lazy-load Aztec SDK so it never enters the SSR import graph.
        // Top-level imports of @aztec/* drag in @aztec/foundation, whose pino logger
        // tries to dynamically require pino-pretty at module init and crashes Next's
        // serverless bundle (HTTP 500 on every page → social previews break).
        const [{ AztecAddress }, { Fr }, { createAztecNodeClient }, { deriveStorageSlotInMap }] = await Promise.all([
            import("@aztec/aztec.js/addresses"),
            import("@aztec/aztec.js/fields"),
            import("@aztec/aztec.js/node"),
            import("@aztec/stdlib/hash"),
        ])

        const tokenPublicBalancesSlot = new Fr(TOKEN_PUBLIC_BALANCES_SLOT_INDEX)
        const client = createAztecNodeClient(nodeUrl)
        const owner = AztecAddress.fromString(address)
        const balances: TokenBalance[] = []

        for (const token of network.tokens) {
            try {
                const tokenAddr = AztecAddress.fromString(token.contract)
                // Type assertions needed: @aztec/aztec.js and @aztec/stdlib resolve to different @aztec/foundation versions
                const slot = await deriveStorageSlotInMap(tokenPublicBalancesSlot as any, owner as any)
                const balanceField = await client.getPublicStorageAt('latest', tokenAddr, slot as any)
                const raw = balanceField.toBigInt()
                const amount = Number(formatUnits(raw, token.decimals))

                balances.push({
                    network: network.caip2Id,
                    token: token.symbol,
                    amount,
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: token.contract === network.nativeTokenAddress,
                })
            } catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e as Error, token, network))
            }
        }

        return balances
    }
}
