import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";

export class FuelGasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.FuelMainnet.includes(network.caip2Id) || KnownInternalNames.Networks.FuelTestnet.includes(network.caip2Id))
    }

    async getGas({address: string, network: Network, token: Token}): Promise<any> {
        return 0.000001;
    }
}