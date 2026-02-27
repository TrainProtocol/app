import { NetworkBalance } from "@/Models/Balance";
import { Network } from "@/Models/Network";

export function getTotalBalanceInUSD(networkBalance: NetworkBalance, network: Network): number | null {
    if (!networkBalance.balances?.length) return null;
    return networkBalance.balances.reduce((total, tokenBalance) => {
        const token = network.tokens?.find(t => t.symbol === tokenBalance.token);
        if (!token) return total;
        return total + ((tokenBalance.amount || 0) * (token.priceInUsd || 0));
    }, 0);
}
