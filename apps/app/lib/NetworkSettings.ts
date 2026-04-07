import KnownInternalNames from "./knownIds";

export enum GasCalculation {
    Classic = 'classic',
    OptimismType = 'optimismType'
}

export default class NetworkSettings {
    ChainId?: number | string;
    DefaultPriorityFee?: number;
    BaseFeeMultiplier?: number;
    GasCalculationType?: GasCalculation
    isFeatured?: boolean

    public static KnownSettings: { [network: string]: NetworkSettings } = {};

    private static _isInitialized = false;
    public static Initialize() {
        if (NetworkSettings._isInitialized) {
            return;
        }

        NetworkSettings._isInitialized = true;

        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumMainnet] = {
            ChainId: 42161,
            isFeatured: true,
            DefaultPriorityFee: 0,
            BaseFeeMultiplier: 1.7
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumMainnet] = {
            isFeatured: true,
            DefaultPriorityFee: 0.3,
            BaseFeeMultiplier: 1.7
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BaseSepolia] = {
            ChainId: 84532,
            GasCalculationType: GasCalculation.OptimismType,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BaseMainnet] = {
            ChainId: 8453,
            GasCalculationType: GasCalculation.OptimismType,
            BaseFeeMultiplier: 1.7,
            DefaultPriorityFee: 1,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumSepolia] = {
            ChainId: 421614,
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.AztecDevnet] = {
            ChainId: 'aztec-devnet',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.SolanaDevnet] = {
            ChainId: 'devnet',
        };

    }
}

NetworkSettings.Initialize();
