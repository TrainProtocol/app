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
    WalletConnectWalletAdapter,
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    BitgetWalletAdapter,
    TrustWalletAdapter,
    LedgerWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { ReactNode, useMemo } from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '28168903b2d30c75e5f7f2d71902581b';

function SolanaProvider({ children }: { children: ReactNode }) {
    const settings = useSettingsState();
    const { getEffectiveRpcUrl } = useRpcConfigStore();
    const solNetwork = AppSettings.ApiVersion === 'sandbox' ? WalletAdapterNetwork.Devnet : WalletAdapterNetwork.Mainnet;

    // Find Solana network in settings
    const solanaNetwork = settings?.networks?.find(
        n => n.type?.name === "solana"
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
        new WalletConnectWalletAdapter({
            network: solNetwork,
            options: {
                projectId: WALLETCONNECT_PROJECT_ID,
                metadata: {
                    name: 'Layerwap',
                    description: 'Layerswap App',
                    url: 'https://layerswap.io/app/',
                    icons: ['https://www.layerswap.io/app/symbol.png'],
                },
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