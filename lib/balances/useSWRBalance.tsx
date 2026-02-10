import useSWR from "swr"
import { Network } from "../../Models/Network"
import { BalanceResolver } from "./balanceResolver"

export type TokenBalance = {
    network: string,
    amount: number | undefined,
    decimals: number,
    isNativeCurrency: boolean,
    token: string,
    request_time: string,
}

const useSWRBalance = (address: string | undefined, network: Network | undefined) => {

    const { data, error, mutate, isLoading } = useSWR((network && address) ? `/balances/${address}/${network.slug}` : null, () => {
        if (!address || !network) return
        return new BalanceResolver().getBalance(address, network)
    }, { refreshInterval: 60000 })

    return {
        balance: data as TokenBalance[] | null | undefined,
        isBalanceLoading: isLoading,
        isError: error,
        mutate
    }
}

export default useSWRBalance
