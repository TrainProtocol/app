import KnownInternalNames from "../../knownIds";
import { useSettingsState } from "@/context/settings";
import { InternalConnector, Wallet, WalletProvider } from "@/Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { extractAztecAddress } from "./utils";
import { useCallback, useMemo } from "react";
import { useAztecWalletContext } from "@/components/WalletProviders/AztecWalletProvider";
import { useAztecWalletStore } from "@/stores/aztecWalletStore";
import { useWalletStore } from "@/stores/walletStore";

const commonSupportedNetworks = [
    KnownInternalNames.Networks.AztecDevnet,
]

const name = 'Aztec'
const id = 'aztec'

export default function useAztec(): WalletProvider {
    const { networks } = useSettingsState()

    const { connect, disconnect } = useAztecWalletContext();
    const { discoveredProviders } = useAztecWalletStore();
    const wallets = useWalletStore((state) => state.connectedWallets)
    const addWallet = useWalletStore((state) => state.connectWallet)
    const removeWallet = useWalletStore((state) => state.disconnectWallet)

    const disconnectWallets = useCallback(async () => {
        removeWallet(name)
        await disconnect();
    }, [disconnect, removeWallet]);

    const aztecWallet = useMemo(() => {
        const connectedWallets = wallets.filter(wallet => wallet.providerName === name)
        const wallet = connectedWallets[0]
        if (!wallet) return undefined;

        return {
            id: wallet.id,
            displayName: wallet.displayName,
            addresses: [wallet.address],
            address: wallet.address,
            providerName: name,
            isActive: true,
            icon: resolveWalletConnectorIcon({ connector: name, address: wallet.address }),
            disconnect: () => disconnectWallets(),
            withdrawalSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
            autofillSupportedNetworks: commonSupportedNetworks,
            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.caip2Id))?.logoUrl
        }
    }, [wallets, networks, discoveredProviders, disconnectWallets])

    const connectWallet = async (params?: { connector?: InternalConnector }) => {
        try {
            const providerId = params?.connector?.id;
            if (!providerId) {
                throw new Error("No wallet provider selected");
            }

            const connectedWallet = await connect(providerId);

            let connectedAddress: string | undefined;
            try {
                const accounts = await Promise.race([
                    connectedWallet.getAccounts(),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('getAccounts timeout')), 10000)
                    ),
                ]);
                connectedAddress = accounts.length > 0 ? extractAztecAddress(accounts[0]) : undefined;
            } catch {
                throw new Error('No accounts found')
            }

            if (connectedAddress) {
                const activeProvider = discoveredProviders.find(p => p.id === providerId);
                const walletName = activeProvider?.name ?? 'Aztec Wallet';

                const newWallet: Wallet = {
                    id: activeProvider?.id ?? '',
                    displayName: `${walletName} - Aztec`,
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    providerName: name,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: name, address: connectedAddress }),
                    disconnect: () => disconnectWallets(),
                    withdrawalSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.caip2Id))?.logoUrl
                }
                addWallet(newWallet)
                return newWallet;
            }
        } catch (error) {
            console.error(`Error connecting Aztec wallet:`, error);
            throw error;
        }
    }

    const availableWalletsForConnect: InternalConnector[] = useMemo(() => {
        return discoveredProviders.map(provider => ({
            id: provider.id,
            name: provider.name,
            icon: provider.icon,
            providerName: name,
            extensionNotFound: false,
            hasBrowserExtension: true,
        }));
    }, [discoveredProviders])

    const provider = {
        connectWallet,
        disconnectWallets,
        availableWalletsForConnect,
        activeAccountAddress: aztecWallet?.address,
        connectedWallets: aztecWallet ? [aztecWallet] : undefined,
        activeWallet: aztecWallet,
        withdrawalSupportedNetworks: commonSupportedNetworks,
        asSourceSupportedNetworks: commonSupportedNetworks,
        autofillSupportedNetworks: commonSupportedNetworks,
        name,
        id,
        ready: true,
    }

    return provider
}
