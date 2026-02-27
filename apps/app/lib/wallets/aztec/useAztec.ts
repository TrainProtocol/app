import KnownInternalNames from "../../knownIds";
import { useSettingsState } from "../../../context/settings";
import { InternalConnector, Wallet, WalletProvider } from "../../../Models/WalletProvider";
import { resolveWalletConnectorIcon } from "../utils/resolveWalletIcon";
import { useMemo } from "react";
import { useAztecNodeUrl, useAztecSponsorAddress } from "./configs";
import { useAztecWalletContext } from "./AztecWalletProvider";

export default function useAztec(): WalletProvider {
    const commonSupportedNetworks = [
        KnownInternalNames.Networks.AztecTestnet,
    ]

    const { networks } = useSettingsState()

    const aztecNodeUrl = useAztecNodeUrl();
    const sponsorAddress = useAztecSponsorAddress();

    const name = 'Aztec'
    const id = 'aztec'

    const {
        wallet,
        connected,
        accountAddress,
        discoveredProviders,
        connect,
        disconnect,
    } = useAztecWalletContext();

    const aztecWallet = useMemo(() => {
        if (!wallet || !connected || !accountAddress) return undefined;

        const providerName = discoveredProviders.find(p => !p.isDisconnected())?.name ?? 'Aztec Wallet';

        return {
            id: providerName,
            displayName: `${providerName} - Aztec`,
            addresses: [accountAddress],
            address: accountAddress,
            providerName: id,
            isActive: true,
            icon: resolveWalletConnectorIcon({ connector: name, address: accountAddress }),
            disconnect: () => disconnectWallets(),
            withdrawalSupportedNetworks: commonSupportedNetworks,
            asSourceSupportedNetworks: commonSupportedNetworks,
            networkIcon: networks.find(n => commonSupportedNetworks.some(name => name === n.caip2Id))?.logoUrl
        }
    }, [wallet, connected, accountAddress, networks, discoveredProviders])

    const connectWallet = async (params?: { connector?: InternalConnector }) => {
        try {
            const providerId = params?.connector?.id;
            if (!providerId) {
                throw new Error("No wallet provider selected");
            }

            const connectedWallet = await connect(providerId);

            const accounts = await connectedWallet.getAccounts();
            const connectedAddress = accounts[0]?.toString();

            if (connectedAddress) {
                const activeProvider = discoveredProviders.find(p => p.id === providerId);
                const walletName = activeProvider?.name ?? 'Aztec Wallet';

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
        if (discoveredProviders.length === 0) {
            // No wallets discovered — show a generic "install" prompt
            return [{
                id: 'aztec-no-wallet',
                name: 'Aztec Wallet',
                providerName: name,
                extensionNotFound: true,
                hasBrowserExtension: true,
                installUrl: "https://aztec.network/ecosystem",
            }]
        }

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
        name,
        id,
        ready: true,
    }

    return provider
}
