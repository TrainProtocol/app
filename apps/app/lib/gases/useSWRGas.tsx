import useSWR from "swr"
import { Network, Token } from "../../Models/Network"
import { GasResolver } from "./gasResolver"
import { GasWithToken } from "./providers/types"

const useSWRGas = (address: string | undefined | null, network: Network | undefined | null, token?: Token | null): { gasData: GasWithToken | undefined, isGasLoading: boolean, gasError: any } => {

    const { data: gasData, error: gasError, isLoading } = useSWR((network && address) ? `/gases/${address}/${network.caip2Id}/${token?.symbol}` : null, () => {
        if (!network || !token || !address) return
        return new GasResolver().getGas({ address, network, token })
    }, { refreshInterval: 60000 })

    return {
        gasData,
        isGasLoading: isLoading,
        gasError: gasError
    }
}

export default useSWRGas
