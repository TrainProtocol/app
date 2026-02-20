import { BalanceProvider } from "@/Models/BalanceProvider";
import { TokenBalance } from "@/Models/Balance";
import { formatUnits } from "viem";
import KnownInternalNames from "@/lib/knownIds";

export class SolanaBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return network.caip2Id === KnownInternalNames.Networks.SolanaMainnet
            || network.caip2Id === KnownInternalNames.Networks.SolanaDevnet
            || network.caip2Id === KnownInternalNames.Networks.SolanaTestnet
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network, _options) => {
        if (!address) return

        const { PublicKey, Connection } = await import("@solana/web3.js")
        class SolanaConnection extends Connection { }
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const walletPublicKey = new PublicKey(address)
        let balances: TokenBalance[] = []

        if (!network?.tokens || !walletPublicKey) return

        const connection = new SolanaConnection(
            `${network.nodes?.[0]?.url}`,
            "confirmed"
        );

        async function getTokenBalanceWeb3(connection: SolanaConnection, tokenAccount) {
            try {
                const info = await connection.getTokenAccountBalance(tokenAccount);
                return info?.value?.uiAmount;
            } catch (error) {
                if (error.message && error.message.includes("could not find account")) {
                    return 0;
                }
                throw error;
            }
        }

        for (const token of network.tokens) {
            try {
                let result: number | null = null

                if (token.contractAddress !== network.nativeTokenAddress) {
                    const sourceToken = new PublicKey(token.contractAddress);
                    const associatedTokenFrom = await getAssociatedTokenAddress(
                        sourceToken,
                        walletPublicKey
                    );
                    if (!associatedTokenFrom) return
                    result = await getTokenBalanceWeb3(connection, associatedTokenFrom)
                } else {
                    const res = await connection.getBalance(walletPublicKey)
                    if (res) result = Number(formatUnits(BigInt(Number(res)), token.decimals))
                }

                if (result != null && !isNaN(result)) {
                    const balance: TokenBalance = {
                        network: network.caip2Id,
                        token: token.symbol,
                        amount: result,
                        request_time: new Date().toJSON(),
                        decimals: Number(token?.decimals),
                        isNativeCurrency: token.contractAddress === network.nativeTokenAddress
                    }

                    balances.push(balance)
                }
            }
            catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e, token, network))
            }
        }

        return balances
    }
}
