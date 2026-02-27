import { GasProps } from "../../../Models/Balance"
import { Network, Token } from "../../../Models/Network"

export type GasWithToken = {
    gas: number,
    token: Token
}

export interface GasProvider {
    supportsNetwork(network: Network): boolean,
    getGas(args: GasProps): Promise<GasWithToken | undefined>
}
