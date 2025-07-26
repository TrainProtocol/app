import axios from "axios";
import { Network } from "../../../Models/Network";
import formatAmount from "../../formatAmount";
import KnownInternalNames from "../../knownIds";

export class ImmutableXBalanceProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.ImmutableXMainnet.includes(network.name) || KnownInternalNames.Networks.ImmutableXGoerli.includes(network.name))  
    }

    fetchBalance = async (address: string, network: Network) => {

        if (!network?.tokens) return

        const res: BalancesResponse = await axios.get(`${network?.nodes[0].url}/v2/balances/${address}`).then(r => r.data)

        const balances = network?.tokens?.map(asset => {
            const balance = res.result.find(r => r.symbol === asset.symbol)

            return {
                network: network.name,
                amount: formatAmount(balance?.balance, asset.decimals),
                decimals: asset.decimals,
                isNativeCurrency: false,
                token: asset.symbol,
                request_time: new Date().toJSON(),
            }
        })

        return balances
    }
}

type BalancesResponse = {
    result: {
        balance: string,
        symbol: string,
        token_address: string
    }[]
}