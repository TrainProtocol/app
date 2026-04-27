import { clusterApiUrl } from "@solana/web3.js";
import {
    ConnectionProvider,
    WalletProvider,
} from "@solana/wallet-adapter-react";
import AppSettings from "../../lib/AppSettings";
import { useSettingsState } from "../../context/settings";
import { useRpcConfigStore } from "../../stores/rpcConfigStore";
import {
    NightlyWalletAdapter,
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    BitgetWalletAdapter,
    TrustWalletAdapter,
    LedgerWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { ReactNode, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } from "@/lib/walletConnect/config";
import { SolanaWalletConnectAdapter } from "@/lib/wallets/solana/connectors/SolanaWalletConnectAdapter";

function SolanaProvider({ children }: { children: ReactNode }) {
    const settings = useSettingsState();
    const { getEffectiveRpcUrl } = useRpcConfigStore();
    const solNetwork = AppSettings.ApiVersion === 'sandbox' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

    // Find Solana network in settings
    const solanaNetwork = settings?.networks?.find(
        n => n.networkType === "solana"
    );

    // Use custom RPC if configured, otherwise use default
    const endpoint = useMemo(() => {
        if (solanaNetwork) {
            return getEffectiveRpcUrl(solanaNetwork);
        }
        return clusterApiUrl(solNetwork);
    }, [solNetwork, solanaNetwork, getEffectiveRpcUrl]);

    const adapters = [
        new PhantomWalletAdapter(),
        new NightlyWalletAdapter(),
        new SolflareWalletAdapter(),
        new BitgetWalletAdapter(),
        new TrustWalletAdapter(),
        new LedgerWalletAdapter(),
        new SolanaWalletConnectAdapter({
            network: solNetwork,
            options: {
                projectId: WALLETCONNECT_PROJECT_ID,
                metadata: WALLETCONNECT_METADATA,
            }
        })
    ]


    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={adapters} autoConnect={true}>
                {children}
            </WalletProvider>
        </ConnectionProvider>
    );
}

export default SolanaProvider;