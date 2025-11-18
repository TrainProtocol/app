
import { GasProps } from "../../Models/Balance";
import { EVMGasProvider } from "./providers/evmGasProvider";
import { FuelGasProvider } from "./providers/fuelGasProvider";
import { ImmutableXGasProvider } from "./providers/immutableXGasProvider";
import { LoopringGasProvider } from "./providers/loopringGasProvider";
import { SolanaGasProvider } from "./providers/solanaGasProvider";
import { StarknetGasProvider } from "./providers/starknetGasProvider";
import { TonGasProvider } from "./providers/tonGasProvider";
import { Provider } from "./providers/types";
// import { ZkSyncGasProvider } from "./providers/zkSyncGasProvider";

export class GasResolver {
    private providers: Provider[] = [
        // new StarknetGasProvider(),
        // new EVMGasProvider(),
        // new FuelGasProvider(),
        // new LoopringGasProvider(),
        // new SolanaGasProvider(),
        // new ZkSyncGasProvider()
    ];

    getGas({ address, network, token, recipientAddress, contractMethod }: GasProps) {
        const provider = this.providers.find(p => p?.supportsNetwork(network));
        if (!provider) return;

        return provider.getGas({ address, network, token, recipientAddress, contractMethod });
    }
}
