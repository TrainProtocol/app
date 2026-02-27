import { useCallback } from "react";
import { useRpcConfigStore } from "../../../stores/rpcConfigStore";
import { useSettingsState } from "../../../context/settings";
import KnownInternalNames from "../../knownIds";

// Default Aztec node URL
const DEFAULT_AZTEC_NODE_URL = "https://devnet.aztec-labs.com";

// Application ID for wallet SDK discovery
export const AZTEC_APP_ID = "train-protocol";

export const useAztecNodeUrl = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_AZTEC_NODE_URL;
    }
    const { networks } = useSettingsState();
    const { getEffectiveRpcUrl } = useRpcConfigStore();
    const aztecNetwork = networks?.find(
        n => n.caip2Id === KnownInternalNames.Networks.AztecTestnet ||
             n.caip2Id.toLowerCase().includes('aztec')
    );

    if (aztecNetwork) {
        return getEffectiveRpcUrl(aztecNetwork);
    }

    return DEFAULT_AZTEC_NODE_URL;
}

// Sponsored fee payment contract address
const DEFAULT_SPONSOR_ADDRESS = '0x280e5686a148059543f4d0968f9a18cd4992520fcd887444b8689bf2726a1f97';

export const useAztecSponsorAddress = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_SPONSOR_ADDRESS;
    }
    const { networks } = useSettingsState();
    const aztecNetwork = networks?.find(
        n => n.caip2Id === KnownInternalNames.Networks.AztecTestnet ||
             n.caip2Id.toLowerCase().includes('aztec')
    );

    // Use sponsor address from network config if available, otherwise default
    return (aztecNetwork as any)?.sponsorAddress || DEFAULT_SPONSOR_ADDRESS;
}

// Hook to get ChainInfo for wallet SDK discovery
// Note: We use `as any` cast because the app may have a different @aztec/foundation
// version than @aztec/wallet-sdk. The Fr types are structurally identical.
export const useAztecChainInfo = () => {
    const aztecNodeUrl = useAztecNodeUrl();

    return useCallback(async () => {
        const { createAztecNodeClient } = await import("@aztec/aztec.js/node");
        const { Fr } = await import("@aztec/aztec.js/fields");

        const node = createAztecNodeClient(aztecNodeUrl);
        const header = await node.getBlockHeader('latest');

        if (header) {
            return {
                chainId: header.globalVariables.chainId as any,
                version: header.globalVariables.version as any,
            };
        }

        // Fallback for devnet
        return {
            chainId: Fr.fromHexString('0x1') as any,
            version: Fr.fromHexString('0x1') as any,
        };
    }, [aztecNodeUrl]);
}
