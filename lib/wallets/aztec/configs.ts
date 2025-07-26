import { AztecWalletSdk, obsidion } from "../../@nemi-fi/wallet-sdk/src/exports";

export const sdk = new AztecWalletSdk({
    aztecNode: "https://full-node.alpha-testnet.aztec.network",
    connectors: [obsidion()],
});