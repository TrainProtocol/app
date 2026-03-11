import { TonClient } from "@ton/ton";
import { Network } from "@/Models/Network";
import { getNetworkRpcUrl } from "@/lib/rpc/resolveNetworkRpcUrl";

const DEFAULT_ENDPOINT = process.env.NEXT_PUBLIC_API_VERSION == 'sandbox'
    ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
    : 'https://toncenter.com/api/v2/jsonRPC';

export function createTonClient(network?: Network): TonClient {
    const endpoint = network ? (getNetworkRpcUrl(network) || DEFAULT_ENDPOINT) : DEFAULT_ENDPOINT;
    return new TonClient({
        endpoint,
        apiKey: process.env.NEXT_PUBLIC_TON_API_KEY,
    });
}

