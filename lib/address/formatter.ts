import { Network } from "@/Models/Network";
import { Address } from "@ton/core";

type AddressFormatProps = {
    address: string;
    network?: Network | null;
    providerName?: string
}

export function addressFormat(props: AddressFormatProps): string {
    const { address, network, providerName } = props

    if (
        network?.slug.toLowerCase().startsWith("starknet")
        || network?.slug.toLowerCase().startsWith("paradex")
        || providerName?.toLowerCase() == 'paradex'
        || providerName?.toLowerCase() == 'starknet'
    ) {
        const removeHexPrefix = (hex: string) => {
            return hex?.replace("0x", "");
        }
        const addHexPrefix = (hex: string) => {
            return `0x${hex}`
        }
        const addAddressPadding = (address: string) => {
            return addHexPrefix(removeHexPrefix(address)?.padStart(64, '0'))
        }

        return addAddressPadding(address?.toLowerCase());

    }
    else if (
        network?.slug.toLowerCase().startsWith("ton")
        || providerName?.toLowerCase() == 'ton'
    ) {
        try {
            return Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true })
        } catch (error) {
            return address
        }
    }
    else if (
        network?.slug.toLowerCase().startsWith("solana")
        || network?.slug.toLowerCase().startsWith("eclipse")
        || network?.slug.toLowerCase().startsWith("soon")
        || network?.slug.toLowerCase().startsWith("tron")
        || network?.slug.toLowerCase().startsWith("bitcoin")
        || providerName?.toLowerCase() == 'solana'
        || providerName?.toLowerCase() == 'tron'
        || providerName?.toLowerCase() == 'bitcoin'
    ) {
        return address
    }
    else {
        return address?.toLowerCase();
    }
}