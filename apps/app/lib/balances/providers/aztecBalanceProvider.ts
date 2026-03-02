import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import KnownInternalNames from "@/lib/knownIds";
import { AztecAddress } from "@aztec/aztec.js/addresses";
import { Fr } from "@aztec/aztec.js/fields";
import { createAztecNodeClient } from "@aztec/aztec.js/node";
import { deriveStorageSlotInMap } from "@aztec/stdlib/hash";
import { formatUnits } from "viem";

// Storage slot for public_balances map in the Token contract (slot 9 for standard Aztec token)
const TOKEN_PUBLIC_BALANCES_SLOT = new Fr(9n)

export class AztecBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.caip2Id === KnownInternalNames.Networks.AztecTestnet
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        if (!address || !network?.tokens) return []

        const nodeUrl = network.nodes?.[0]?.url
        if (!nodeUrl) return []

        const client = createAztecNodeClient(nodeUrl)
        const owner = AztecAddress.fromString(address)
        const balances: TokenBalance[] = []

        for (const token of network.tokens) {
            try {
                const tokenAddr = AztecAddress.fromString(token.contractAddress)
                // Type assertions needed: @aztec/aztec.js and @aztec/stdlib resolve to different @aztec/foundation versions
                const slot = await deriveStorageSlotInMap(TOKEN_PUBLIC_BALANCES_SLOT as any, owner as any)
                const balanceField = await client.getPublicStorageAt('latest', tokenAddr, slot as any)
                const raw = balanceField.toBigInt()
                const amount = Number(formatUnits(raw, token.decimals))

                balances.push({
                    network: network.caip2Id,
                    token: token.symbol,
                    amount,
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: token.contractAddress === network.nativeTokenAddress,
                })
            } catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e as Error, token, network))
            }
        }

        return balances
    }
}
