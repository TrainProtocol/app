import { defineNetworkAdapter } from "@layerswap/ui-kit";
import { getNativeToken, NetworkTypes, type ExtendedNetwork } from "@/Models/Network";
import { getNetworkRpcUrls } from "@/lib/rpc/resolveNetworkRpcUrl";

export const walletNetworkAdapter = defineNetworkAdapter<ExtendedNetwork>({
    getId: network => network.caip2Id,
    getDisplayName: network => network.displayName,
    getChainId: network => network.chainId,
    getRpcUrls: network => getNetworkRpcUrls(network),
    getIcon: network => network.logoUrl,
    getTransactionExplorerUrl: network => network.explorerUrlTemplate?.transaction,
    getAccountExplorerUrl: network => network.explorerUrlTemplate?.address,
    getNativeCurrency: network => {
        const token = getNativeToken(network);
        return token && { symbol: token.symbol, decimals: token.decimals };
    },
    getMulticallAddress: network => network.contracts?.find(contract => contract.type === "Multicall")?.address,
    isEvmNetwork: network => network.networkType === NetworkTypes.EVM,
    isSolanaNetwork: network => network.networkType === NetworkTypes.Solana,
    isStarknetNetwork: network => network.networkType === NetworkTypes.Starknet,
    isTronNetwork: network => network.networkType.toLowerCase() === "tron",
    isBitcoinNetwork: network => network.networkType.toLowerCase() === "bitcoin",
    isTonNetwork: network => network.networkType === NetworkTypes.TON,
    isFuelNetwork: network => network.networkType.toLowerCase() === "fuel",
});
