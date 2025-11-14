// Dynamic import to prevent SSR issues
let AztecWallet: typeof import("@azguardwallet/aztec-wallet").AztecWallet | null = null;

const getAztecWallet = async () => {
    if (!AztecWallet && typeof window !== 'undefined') {
        const module = await import("@azguardwallet/aztec-wallet");
        AztecWallet = module.AztecWallet;
    }
    return AztecWallet;
};

export const aztecNodeUrl = "https://node.testnet.azguardwallet.io";

// Dapp metadata for AzguardWallet connection
export const dappMetadata = {
    name: "TRAIN",
    description: "Cross-chain bridge for Aztec",
    url: 'https://app.train.tech/',
    logo: 'https://app.train.tech/symbol.png',
};

// Chain configuration - using devnet for testnet
export const aztecChain = "devnet";

// Store wallet instance for reuse
let walletInstance: Awaited<ReturnType<typeof import("@azguardwallet/aztec-wallet").AztecWallet.connect>> | null = null;

export const getWalletInstance = async () => {
    if (typeof window === 'undefined') {
        throw new Error("Aztec wallet can only be used on the client side");
    }
    
    if (!walletInstance) {
        const Wallet = await getAztecWallet();
        if (!Wallet) {
            throw new Error("Failed to load AztecWallet");
        }
        walletInstance = await Wallet.connect(dappMetadata, aztecChain);
    }
    return walletInstance;
};

export const clearWalletInstance = () => {
    walletInstance = null;
};