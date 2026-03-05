import KnownInternalNames from "../../knownIds";
import { useSettingsState } from "../../../context/settings";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { extractAztecAddress } from "./utils";
import { useMemo } from "react";
import { useAztecWalletContext, AZGUARD_PROVIDER_ID } from "../../../components/WalletProviders/AztecWalletProvider";
import { azguardBase64 } from "@/components/Icons/Base64/Azguard";

const commonSupportedNetworks = [
    KnownInternalNames.Networks.AztecDevnet,
]

export default function useAztec(): WalletProvider {
    const { networks } = useSettingsState()

    const name = 'Aztec'
    const id = 'aztec'

    const {
        wallet,
        accountAddress,
        discoveredProviders,
        azguardDetected,
        connect,
        disconnect,
    } = useAztecWalletContext();

    const aztecWallet = useMemo(() => {
        if (!wallet || !accountAddress) return undefined;

        const providerName = azguardDetected && discoveredProviders.length === 0
            ? 'Azguard'
            : discoveredProviders.find(p => !p.isDisconnected())?.name ?? 'Aztec Wallet';

        return {
            id: providerName,
            displayName: `${providerName} - Aztec`,
            addresses: [accountAddress],
            address: accountAddress,
            providerName: id,
            isActive: true,
            icon: resolveWalletConnectorIcon({ connector: name, address: accountAddress, iconUrl: providerName === 'Azguard' ? azguardBase64 : undefined }),
            disconnect: () => disconnectWallets(),
            withdrawalSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
            autofillSupportedNetworks: commonSupportedNetworks,
            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.caip2Id))?.logoUrl
        }
    }, [wallet, accountAddress, networks, discoveredProviders, azguardDetected])

    const connectWallet = async (params?: { connector?: InternalConnector }) => {
        try {
            const providerId = params?.connector?.id;
            if (!providerId) {
                throw new Error("No wallet provider selected");
            }

            const connectedWallet = await connect(providerId);

            // getAccounts can hang if the wallet's encrypted channel is stale on reconnect
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
                // Fall back to address already set by AztecWalletProvider's confirmConnection
                connectedAddress = accountAddress ?? undefined;
            }

            if (connectedAddress) {
                const walletName = providerId === AZGUARD_PROVIDER_ID
                    ? 'Azguard'
                    : discoveredProviders.find(p => p.id === providerId)?.name ?? 'Aztec Wallet';
                const activeProvider = discoveredProviders.find(p => p.id === providerId);

                const newWallet: Wallet = {
                    id: walletName,
                    displayName: `${walletName} - Aztec`,
                    addresses: [connectedAddress],
                    address: connectedAddress,
                    providerName: id,
                    isActive: true,
                    icon: resolveWalletConnectorIcon({ connector: name, address: connectedAddress, iconUrl: activeProvider?.icon }),
                    disconnect: () => disconnectWallets(),
                    withdrawalSupportedNetworks: commonSupportedNetworks,
                    asSourceSupportedNetworks: commonSupportedNetworks,
                    autofillSupportedNetworks: commonSupportedNetworks,
                    networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.caip2Id))?.logoUrl
                }

                return newWallet;
            }
        } catch (error) {
            console.error(`Error connecting Aztec wallet:`, error);
            throw error;
        }
    }

    const disconnectWallets = async () => {
        await disconnect();
    }

    const availableWalletsForConnect: InternalConnector[] = useMemo(() => {
        const sdkWallets: InternalConnector[] = discoveredProviders.map(provider => ({
            id: provider.id,
            name: provider.name,
            icon: provider.icon,
            providerName: name,
            extensionNotFound: false,
            hasBrowserExtension: true,
        }));

        // Append Azguard if detected and not already in the SDK-discovered list
        if (azguardDetected && !sdkWallets.some(w => w.id === AZGUARD_PROVIDER_ID)) {
            sdkWallets.push({
                id: AZGUARD_PROVIDER_ID,
                name: 'Azguard',
                icon: azguardBase64,
                providerName: name,
                extensionNotFound: false,
                hasBrowserExtension: true,
            });
        }

        if (sdkWallets.length === 0) {
            return [];
        }

        return sdkWallets;
    }, [discoveredProviders, azguardDetected])

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