import { addressFormat as formatWithProviders } from "@layerswap/utils";
import { Network } from "@/Models/Network";
import { toWidgetNetwork } from "@/lib/wallets/layerswap/widgetNetwork";

export type AddressFormatProps = {
    address: string;
    network?: Network | null;
    providerName?: string
}

export function addressFormat({ address, network, providerName }: AddressFormatProps): string {
    return formatWithProviders({ address, network: network ? toWidgetNetwork(network) : undefined, providerName })
}
