import { useCallback } from "react";
import { useRpcConfigStore } from "../../../stores/rpcConfigStore";
import { useSettingsState } from "../../../context/settings";
import KnownInternalNames from "../../knownIds";
import { NetworkTypes } from "@/Models/Network";

export const AZTEC_APP_ID = "Train Protocol";

export const useAztecNodeUrl = () => {
    const { networks } = useSettingsState();
    const { getEffectiveRpcUrl } = useRpcConfigStore();
    const aztecNetwork = networks?.find(
        n => n.caip2Id === KnownInternalNames.Networks.AztecDevnet ||
            n.caip2Id === KnownInternalNames.Networks.AztecTestnet ||
            n.caip2Id.toLowerCase().includes('aztec')
    );

    if (aztecNetwork) {
        return getEffectiveRpcUrl(aztecNetwork);
    }
}

// Sponsored fee payment contract address
const DEFAULT_SPONSOR_ADDRESS = '0x280e5686a148059543f4d0968f9a18cd4992520fcd887444b8689bf2726a1f97';

export const useAztecSponsorAddress = () => {
    if (typeof window === 'undefined') {
        return DEFAULT_SPONSOR_ADDRESS;
    }
    const { networks } = useSettingsState();
    const aztecNetwork = networks?.find(
        n => n.caip2Id === KnownInternalNames.Networks.AztecDevnet ||
            n.caip2Id === KnownInternalNames.Networks.AztecTestnet ||
            n.caip2Id.toLowerCase().includes('aztec')
    );

    // Use sponsor address from network config if available, otherwise default
    return (aztecNetwork as any)?.sponsorAddress || DEFAULT_SPONSOR_ADDRESS;
}

export const useAztecCapabilityManifest = () => {
    const { networks } = useSettingsState();

    return useCallback(async () => {
        const { AztecAddress } = await import("@aztec/aztec.js/addresses");

        const aztecNetworks = (networks ?? []).filter(
            n => n.networkType === NetworkTypes.Aztec || n.caip2Id?.toLowerCase().startsWith('aztec:')
        );

        const trainContracts = aztecNetworks
            .map(n => n.trainContract)
            .filter((addr): addr is string => !!addr)
            .map(addr => AztecAddress.fromStringUnsafe(addr));

        const tokenContracts = aztecNetworks.flatMap(n =>
            (n.tokens ?? [])
                .map(t => t.contract)
                .filter((addr): addr is string => !!addr && addr !== n.nativeTokenAddress)
                .map(addr => AztecAddress.fromStringUnsafe(addr))
        );

        // Canonical AuthRegistry — userLock's SetPublicAuthwitContractInteraction
        // calls set_authorized here as part of the batched transaction.
        const authRegistryAddress = AztecAddress.fromBigIntUnsafe(1n);

        return {
            version: '1.0' as const,
            metadata: {
                name: 'Train Protocol',
                version: '1.0.0',
                description: 'Cross-chain atomic swaps',
                url: typeof window !== 'undefined' ? window.location.origin : '',
            },
            capabilities: [
                { type: 'accounts' as const, canGet: true, canCreateAuthWit: true },
                ...(trainContracts.length + tokenContracts.length > 0 ? [{
                    type: 'contracts' as const,
                    contracts: [...trainContracts, ...tokenContracts],
                    canRegister: true,
                    canGetMetadata: true,
                }] : []),
                ...(trainContracts.length > 0 ? [{
                    type: 'simulation' as const,
                    transactions: {
                        scope: trainContracts.flatMap(addr => [
                            { contract: addr, function: 'get_user_lock' },
                            { contract: addr, function: 'get_solver_lock' },
                            { contract: addr, function: 'get_solver_lock_count' },
                        ]),
                    },
                }] : []),
                ...(trainContracts.length + tokenContracts.length > 0 ? [{
                    type: 'transaction' as const,
                    scope: [
                        ...trainContracts.flatMap(addr => [
                            { contract: addr, function: 'user_lock' },
                            { contract: addr, function: 'redeem_solver' },
                            { contract: addr, function: 'refund_user' },
                        ]),
                        ...tokenContracts.flatMap(addr => [
                            { contract: addr, function: 'transfer_public_to_public' },
                        ]),
                        { contract: authRegistryAddress, function: 'set_authorized' },
                    ],
                }] : []),
            ],
        };
    }, [networks]);
};

// Hook to get ChainInfo for wallet SDK discovery
// Note: We use `as any` cast because the app may have a different @aztec/foundation
// version than @aztec/wallet-sdk. The Fr types are structurally identical.
export const useAztecChainInfo = () => {
    const aztecNodeUrl = useAztecNodeUrl();

    return useCallback(async () => {
        if(!aztecNodeUrl) {
            throw new Error("Aztec node URL is not available");
        }
        const { createAztecNodeClient } = await import("@aztec/aztec.js/node");
        const { Fr } = await import("@aztec/aztec.js/fields");

        const node = createAztecNodeClient(aztecNodeUrl);
        // aztec.js 5.0 removed `getBlockHeader`; chain id + rollup version are now
        // exposed directly and don't depend on a block existing (works on fresh devnets).
        const [chainId, version] = await Promise.all([
            node.getChainId(),
            node.getVersion(),
        ]);

        return {
            chainId: new Fr(chainId) as any,
            version: new Fr(version) as any,
        };
    }, [aztecNodeUrl]);
}
