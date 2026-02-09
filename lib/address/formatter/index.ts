import { Address } from "@ton/core";

function getNetworkId(network: { name?: string; slug?: string } | null): string {
    return network ? ((network as any).slug ?? (network as any).name ?? "") : "";
}

export function addressFormat(address: string, network: { name?: string; slug?: string } | null): string {
    const id = getNetworkId(network);

    if (id.toLowerCase().startsWith("starknet")) {
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
    else if (id.toLowerCase().startsWith("ton")) {
        try {
            return Address.parse(address).toString({ bounceable: false, testOnly: false, urlSafe: true })
        } catch (error) {
            return address
        }
    }
    else if (id.toLowerCase().startsWith("solana") || id.toLowerCase().startsWith("eclipse")) {
        return address
    }
    else {
        return address?.toLowerCase();
    }
}