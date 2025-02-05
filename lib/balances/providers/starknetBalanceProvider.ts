import { Balance } from "../../../Models/Balance";
import { Network } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import Erc20Abi from '../../abis/ERC20.json'
import KnownInternalNames from "../../knownIds";

export class StarknetBalanceProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.StarkNetMainnet.includes(network.name) || KnownInternalNames.Networks.StarkNetGoerli.includes(network.name) || KnownInternalNames.Networks.StarkNetSepolia.includes(network.name))
    }

    fetchBalance = async (address: string, network: Network) => {
        const {
            Contract,
            RpcProvider,
            uint256,
        } = await import("starknet");
        const { BigNumber } = await import("ethers");

        let balances: Balance[] = []

        if (!network?.tokens) return

        const provider = new RpcProvider({
            nodeUrl: network.nodes[0].url,
        });

        for (let i = 0; i < network.tokens.length; i++) {
            try {
                const token = network.tokens[i]

                const erc20 = new Contract(Erc20Abi, token.contract!, provider);
                const balanceResult = await erc20.balanceOf(address);
                const balanceInWei = BigNumber.from(uint256.uint256ToBN(balanceResult.balance).toString()).toString();

                const balance = {
                    network: network.name,
                    token: token.symbol,
                    amount: formatAmount(balanceInWei, token.decimals),
                    request_time: new Date().toJSON(),
                    decimals: token.decimals,
                    isNativeCurrency: false,
                }
                balances = [
                    ...balances,
                    balance
                ]
            }
            catch (e) {
                console.log(e)
            }
        }
        return balances
    }
}