import { NetworkNode } from "@/Models/Network";

/**
 * Curated public RPC endpoints for non-EVM chains.
 * Keyed by CAIP-2 ID.
 */
export const NON_EVM_NODES: Record<string, NetworkNode[]> = {
    // ── Solana ──
    'solana:mainnet': [
        { url: 'https://api.mainnet-beta.solana.com', providerName: 'solana-official' },
        { url: 'https://solana-rpc.publicnode.com', providerName: 'publicnode' },
        { url: 'https://rpc.ankr.com/solana', providerName: 'ankr' },
    ],
    'solana:devnet': [
        { url: 'https://api.devnet.solana.com', providerName: 'solana-official' },
    ],
    'solana:testnet': [
        { url: 'https://api.testnet.solana.com', providerName: 'solana-official' },
    ],

    // ── Starknet ──
    'starknet:SN_MAIN': [
        { url: 'https://starknet-mainnet-rpc.publicnode.com', providerName: 'publicnode' },
        { url: 'https://free-rpc.nethermind.io/mainnet-juno/', providerName: 'nethermind' },
        { url: 'https://rpc.starknet.lava.build', providerName: 'lava' },
    ],
    'starknet:SN_SEPOLIA': [
        { url: 'https://starknet-sepolia.drpc.org', providerName: 'drpc' },
        { url: 'https://starknet-sepolia-rpc.publicnode.com', providerName: 'publicnode' },
        { url: 'https://free-rpc.nethermind.io/sepolia-juno/', providerName: 'nethermind' },
    ],

    // ── Aztec ──
    'aztec:aztec-devnet': [
        { url: 'https://rpc.testnet.aztec-labs.com', providerName: 'aztec-labs' },
    ],

    // ── TON ──
    'ton:mainnet': [
        { url: 'https://toncenter.com/api/v2/jsonRPC', providerName: 'toncenter' },
    ],
    'ton:testnet': [
        { url: 'https://testnet.toncenter.com/api/v2/jsonRPC', providerName: 'toncenter-testnet' },
    ],
}
