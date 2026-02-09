import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";

export class ImmutableXGasProvider {
    supportsNetwork(network: Network): boolean {
        return (KnownInternalNames.Networks.ImmutableXMainnet || KnownInternalNames.Networks.ImmutableXGoerli).includes(network.slug)
    }

    async getGas({ address: string, network: Network, token: Token }): Promise<any> {
        return undefined;
    }
}