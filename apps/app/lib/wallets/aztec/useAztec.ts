import { useSettingsState } from "@/context/settings";
import type { InternalConnector, Wallet } from "@layerswap/widget-types";
import type { WalletConnectionProvider } from "@layerswap/wallet-core/types";
import { normalizeIconSrc } from "@layerswap/wallet-core";
import { extractAztecAddress } from "./utils";
import { useCallback, useMemo } from "react";
import { useAztecWalletContext } from "@/components/WalletProviders/AztecWalletProvider";
import { useActiveAztecAccount } from "@/components/WalletProviders/ActiveAztecAccount";
import { useWalletStore } from "@/stores/walletStore";
import KnownAztecConnectors from "./KnownAztecConnectors";
import { NetworkTypes } from "@/Models/Network";

const name = 'Aztec'
const id = 'aztec'

export default function useAztec(): WalletConnectionProvider {
    const { networks } = useSettingsState()
    const supportedNetworks = useMemo(() => networks
        .filter(network => network.networkType === NetworkTypes.Aztec || network.caip2Id.toLowerCase().startsWith('aztec:'))
        .map(network => network.caip2Id), [networks])
    const networkIcon = networks.find(network => supportedNetworks.includes(network.caip2Id))?.logoUrl

    const { connect, disconnect } = useAztecWalletContext();
    const { activeAddress: activeSelectedAddress, setActiveAddress } = useActiveAztecAccount();
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

        const addresses = wallet.addresses.length > 0 ? wallet.addresses : [wallet.address]
        const address = activeSelectedAddress && addresses.includes(activeSelectedAddress)
            ? activeSelectedAddress
            : wallet.address

        return {
            id: wallet.id,
            displayName: wallet.displayName,
            addresses,
            address,
            providerName: name,
            isActive: true,
            icon: wallet.icon,
            disconnect: () => disconnectWallets(),
            withdrawalSupportedNetworks: supportedNetworks,
            asSourceSupportedNetworks: supportedNetworks,
            autofillSupportedNetworks: supportedNetworks,
            networkIcon,
        }
    }, [wallets, disconnectWallets, activeSelectedAddress, supportedNetworks, networkIcon])

    const connectWallet = useCallback(async (params?: { connector?: InternalConnector }) => {
        try {
            const providerId = params?.connector?.id;
            if (!providerId) {
                throw new Error("No wallet provider selected");
            }

            const connectedWallet = await connect(providerId);
            let connectedAddresses: string[] = [];
            try {
                const accounts = await Promise.race([
                    connectedWallet.getAccounts(),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('getAccounts timeout')), 10000)
                    ),
                ]);
                connectedAddresses = accounts.map(account => extractAztecAddress(account));
            } catch (error) {
                console.error(`Error getting accounts:`, error);
                throw new Error('No accounts found')
            }

            if (connectedAddresses.length > 0) {
                const walletName = params?.connector?.name ?? 'Azguard';
                const primaryAddress = connectedAddresses[0];

                const newWallet: Wallet = {
                    id: providerId,
                    displayName: `${walletName} - Aztec`,
                    addresses: connectedAddresses,
                    address: primaryAddress,
                    providerName: name,
                    isActive: true,
                    icon: normalizeIconSrc(params?.connector?.icon),
                    disconnect: () => disconnectWallets(),
                    withdrawalSupportedNetworks: supportedNetworks,
                    asSourceSupportedNetworks: supportedNetworks,
                    autofillSupportedNetworks: supportedNetworks,
                    networkIcon,
                }
                addWallet(newWallet)
                return newWallet;
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                const err = new Error('Azguard wallet extension not found. Please install it and try again.');
                (err as any).extensionNotFound = true;
                throw err;
            }
            console.error(`Error connecting Aztec wallet:`, error);
            throw error;
        }
    }, [addWallet, connect, disconnectWallets, networkIcon, supportedNetworks])

    const availableConnectors: InternalConnector[] = useMemo(() => {
        const azguard = KnownAztecConnectors[0];
        return [{
            id: azguard.id,
            name: azguard.name,
            icon: azguard.icon,
            providerName: name,
            extensionNotFound: false,
            hasBrowserExtension: true,
            installUrl: 'https://azguardwallet.io/',
        }];
    }, [])

    const switchAccount = useCallback(async (_wallet: Wallet, address: string) => {
        setActiveAddress(address);
    }, [setActiveAddress]);

    return useMemo<WalletConnectionProvider>(() => ({
        connectWallet,
        disconnectWallets,
        switchAccount,
        availableConnectors,
        connectedWallets: aztecWallet ? [aztecWallet] : undefined,
        activeWallet: aztecWallet,
        withdrawalSupportedNetworks: supportedNetworks,
        asSourceSupportedNetworks: supportedNetworks,
        autofillSupportedNetworks: supportedNetworks,
        name,
        id,
        providerIcon: networkIcon,
        ready: true,
    }), [availableConnectors, aztecWallet, connectWallet, disconnectWallets, networkIcon, supportedNetworks, switchAccount])
}
