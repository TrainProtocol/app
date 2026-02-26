import { Chain, defineChain, parseGwei } from 'viem';
import { Network, getNativeToken } from '../types/network';

export interface ChainFeeConfig {
    defaultPriorityFee?: number
    baseFeeMultiplier?: number
}

export default function resolveChain(
    network: Network,
    customRpcUrl?: string,
    feeConfig?: ChainFeeConfig
): Chain | undefined {
    const nativeToken = getNativeToken(network);
    const nativeCurrency = nativeToken?.symbol;

    if (!nativeCurrency || !nativeToken) {
        return undefined;
    }

    const evm_multicall_contract = network.contracts?.find(c => c.type === 'Multicall')?.address;
    const rpcUrl = customRpcUrl || network.nodes?.[0]?.url;

    if (!rpcUrl) return undefined;

    const res = defineChain({
        id: Number(network.chainId),
        name: network.displayName,
        nativeCurrency: {
            name: nativeCurrency,
            symbol: nativeCurrency,
            decimals: nativeToken.decimals,
        },
        rpcUrls: {
            default: { http: [rpcUrl] },
            public: { http: [rpcUrl] },
        },
        contracts: evm_multicall_contract ? {
            multicall3: { address: evm_multicall_contract as `0x${string}` }
        } : undefined,
    });

    if (feeConfig?.defaultPriorityFee !== undefined) {
        const fee = feeConfig.defaultPriorityFee.toString();
        res.fees = { ...res.fees, defaultPriorityFee: () => parseGwei(fee) };
    }
    if (feeConfig?.baseFeeMultiplier !== undefined) {
        const multiplier = feeConfig.baseFeeMultiplier;
        res.fees = { ...res.fees, baseFeeMultiplier: () => multiplier };
    }

    return res as Chain;
}
