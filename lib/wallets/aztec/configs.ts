import { AztecWalletSdk, obsidion } from "@nemi-fi/wallet-sdk";

export const aztecNodeUrl = "https://node.testnet.azguardwallet.io";

export const sdk = new AztecWalletSdk({
    aztecNode: aztecNodeUrl,
    connectors: [obsidion()],
});