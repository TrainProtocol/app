
import { GasProps } from "../../Models/Balance";
import { EVMGasProvider } from "./providers/evmGasProvider";
import { SolanaGasProvider } from "./providers/solanaGasProvider";
import { StarknetGasProvider } from "./providers/starknetGasProvider";

export class GasResolver {
    private providers = [
        new EVMGasProvider(),
        new SolanaGasProvider(),
        new StarknetGasProvider(),
    ];

    getGas({ address, network, token }: GasProps) {
        const provider = this.providers.find(p => p.supportsNetwork(network));
        if (!provider) return;

        return provider.getGas({ address, network, token });
    }
}
