import { isValidAddress as validateWithProviders, EVMAddressUtilsProvider } from "@layerswap/utils";
import { Network } from "@/Models/Network";
import { toWidgetNetwork } from "@/lib/wallets/layerswap/widgetNetwork";

const evmAddresses = new EVMAddressUtilsProvider();

export function isValidAddress(address?: string, network?: Network | null): boolean {
    if (!address) return false;
    if (!network) return evmAddresses.isValidAddress({ address });
    return validateWithProviders({ address, network: toWidgetNetwork(network) });
}
