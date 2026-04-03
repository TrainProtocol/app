import KnownInternalNames from "./knownIds";

export enum GasCalculation {
    Classic = 'classic',
    OptimismType = 'optimismType'
}

export default class NetworkSettings {
    ChainId?: number | string;
    DefaultPriorityFee?: number;
    BaseFeeMultiplier?: number;
    AccountExplorerTemplate?: string;
    TransactionExplorerTemplate?: string;
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
            AccountExplorerTemplate: 'https://arbiscan.io/address/{0}',
            TransactionExplorerTemplate: 'https://arbiscan.io/tx/{0}',
            DefaultPriorityFee: 0,
            BaseFeeMultiplier: 1.7
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumMainnet] = {
            isFeatured: true,
            AccountExplorerTemplate: 'https://etherscan.io/address/{0}',
            TransactionExplorerTemplate: 'https://etherscan.io/tx/{0}"',
            DefaultPriorityFee: 0.3,
            BaseFeeMultiplier: 1.7
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.EthereumSepolia] = {
            TransactionExplorerTemplate: 'https://sepolia.etherscan.io/tx/{0}',
            AccountExplorerTemplate: 'https://sepolia.etherscan.io/address/{0}'
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BaseSepolia] = {
            ChainId: 84532,
            GasCalculationType: GasCalculation.OptimismType,
            TransactionExplorerTemplate: 'https://sepolia.basescan.org/tx/{0}',
            AccountExplorerTemplate: 'https://sepolia.basescan.org/address/{0}'
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.BaseMainnet] = {
            ChainId: 8453,
            GasCalculationType: GasCalculation.OptimismType,
            BaseFeeMultiplier: 1.7,
            DefaultPriorityFee: 1,
            TransactionExplorerTemplate: 'https://basescan.org/tx/{0}',
            AccountExplorerTemplate: 'https://basescan.org/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.ArbitrumSepolia] = {
            ChainId: 421614,
            TransactionExplorerTemplate: 'https://sepolia.arbiscan.io/tx/{0}',
            AccountExplorerTemplate: 'https://sepolia.arbiscan.io/address/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.AztecDevnet] = {
            ChainId: 'aztec-devnet',
            TransactionExplorerTemplate: 'https://aztecexplorer.xyz/tx/{0}',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.SolanaDevnet] = {
            ChainId: 'devnet',
            TransactionExplorerTemplate: 'https://explorer.solana.com/tx/{0}?cluster=devnet',
            AccountExplorerTemplate: 'https://explorer.solana.com/address/{0}?cluster=devnet',
        };
        NetworkSettings.KnownSettings[KnownInternalNames.Networks.StarkNetSepolia] = {
            TransactionExplorerTemplate: 'https://sepolia.voyager.online/tx/{0}',
            AccountExplorerTemplate: 'https://sepolia.voyager.online/contract/{0}',
        };

    }
}

NetworkSettings.Initialize();
