import { TokenBalance } from "../../../Models/Balance";
import { Network, Token } from "../../../Models/Network";
import { formatUnits } from "viem";
import KnownInternalNames from "../../knownIds";
import { TronWeb } from 'tronweb'
import { insertIfNotExists } from "../helpers";
import { BalanceProvider } from "@/Models/BalanceProvider";
import { getNetworkRpcUrl } from "@/lib/rpc/resolveNetworkRpcUrl";

export class TronBalanceProvider extends BalanceProvider {
    supportsNetwork: BalanceProvider['supportsNetwork'] = (network) => {
        return (KnownInternalNames.Networks.TronMainnet.includes(network.caip2Id) || KnownInternalNames.Networks.TronNile.includes(network.caip2Id))
    }

    fetchBalance: BalanceProvider['fetchBalance'] = async (address, network) => {
        let balances: TokenBalance[] = []
        const nodeUrl = getNetworkRpcUrl(network)

        const provider = new TronWeb({ fullNode: nodeUrl, solidityNode: nodeUrl, privateKey: '01', });

        for (const token of network.tokens) {
            try {
                const balance = await resolveBalance({ network, address, token, provider })

                balances.push(balance)

            }
            catch (e) {
                balances.push(this.resolveTokenBalanceFetchError(e, token, network))
            }
        }

        return balances
    }
}

type GetBalanceProps = {
    network: Network,
    token: Token,
    address: string,
    provider: TronWeb
}

export const resolveBalance = async ({ address, network, token, provider }: GetBalanceProps) => {

    if (token.contract !== '0x0000000000000000000000000000000000000000') {
        const res = await getTRC20Balance({ network, token, address, provider })
        return res
    }
    else {
        const res = await getNativeAssetBalance({ network, token, address, provider })
        return res
    }
}

const getNativeAssetBalance = async ({ network, token, address, provider }: GetBalanceProps) => {

    const balance = await provider.trx.getBalance(address);

    return ({
        network: network.caip2Id,
        token: token.symbol,
        amount: Number(formatUnits(BigInt(balance.toString()), Number(token?.decimals))),
        request_time: new Date().toJSON(),
        decimals: Number(token?.decimals),
        isNativeCurrency: true,
    })

}

const getTRC20Balance = async ({ network, token, address, provider }: GetBalanceProps) => {
    if (!token.contract) throw new Error("Token contract address is missing")

    const tokenContractAddress = token.contract;
    const contract = await provider.contract().at(tokenContractAddress);

    const balanceResponse = await contract.methods.balanceOf(address).call();

    const balance = {
        network: network.caip2Id,
        token: token.symbol,
        amount: Number(formatUnits(BigInt(balanceResponse as any), token.decimals)),
        request_time: new Date().toJSON(),
        decimals: token.decimals,
        isNativeCurrency: false,
    }

    return balance
}