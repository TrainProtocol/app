import { TokenBalance } from "@/Models/Balance";
import { formatUnits } from "viem";
import Erc20Abi from '@/lib/abis/ERC20.json'
import KnownInternalNames from "@/lib/knownIds";
import { BalanceProvider } from "@/Models/BalanceProvider";
import { getNetworkRpcUrl } from "@/lib/rpc/resolveNetworkRpcUrl";

export class StarknetBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.caip2Id) || KnownInternalNames.Networks.StarkNetGoerli.includes(network.caip2Id) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.caip2Id))
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");

        let balances: TokenBalance[] = []

        if (!network?.tokens) return

        const provider = new RpcProvider({
            nodeUrl: getNetworkRpcUrl(network),
        });


        for (const token of network.tokens) {
            try {

                const erc20 = new Contract({ abi: Erc20Abi, address: token.contract, providerOrAccount: provider });
                const balanceResult = await erc20.balanceOf(address);

                const balance = {
                    network: network.caip2Id,
                    token: token.symbol,
                    amount: Number(formatUnits(BigInt(balanceResult), token.decimals)),
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: false,
                }
                balances.push(balance)

            }
            catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e, token, network))
            }
        }
        return balances
    }
}