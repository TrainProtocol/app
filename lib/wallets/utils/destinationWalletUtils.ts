import { Network } from "../../../Models/Network";
import KnownInternalNames from "../../knownIds";

/**
 * Check if destination network requires wallet connection (generic abstraction)
 * @param network - The destination network
 * @returns boolean indicating if wallet connection is required
 */
export const destinationRequiresWallet = (network: Network | undefined): boolean => {
    if (!network) return false;
    // For now, only Aztec requires destination wallet connection
    return network.name === KnownInternalNames.Networks.AztecTestnet;
};

/**
 * Check if destination wallet is connected for networks that require it
 * @param network - The destination network
 * @param providers - Array of wallet providers
 * @returns boolean indicating if required destination wallet is connected
 */
export const hasRequiredDestinationWallet = (network: Network | undefined, providers: any[]): boolean => {
    if (!destinationRequiresWallet(network)) {
        return true; // No wallet required, so consider it "connected"
    }
    
    const destinationProvider = network 
        ? providers.find(p => p.autofillSupportedNetworks?.includes(network.name)) 
        : undefined;
    
    return destinationProvider?.connectedWallets && destinationProvider.connectedWallets.length > 0;
};