
'use client';

import { BakoRequestAPI } from '../../lib/wallets/fuel/lib/connectors/bako-safe/Bako';
import { FuelProvider, type NetworkConfig } from '@fuels/react';
import { useSettingsState } from '@/context/settings';
import { useRpcConfigStore } from '@/stores/rpcConfigStore';
import { useMemo } from 'react';
import { BakoSafeConnector } from '@/lib/wallets/fuel/lib/connectors/bako-safe';
import { FuelWalletConnector } from '@/lib/wallets/fuel/lib/connectors/fuel-wallet';
import { FueletWalletConnector } from '@/lib/wallets/fuel/lib/connectors/fuelet-wallet';
import { NetworkTypes } from '@/Models/Network';

const HOST_URL = 'https://api.bako.global';

const FuelProviderWrapper = ({
    children
}: { children: React.ReactNode }) => {

    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const fuelConfig = useMemo(() => ({
        connectors: [
            new FuelWalletConnector(),
            new BakoSafeConnector({
                api: new BakoRequestAPI(HOST_URL)
            }),
            new FueletWalletConnector(),
        ]
    }), [])

    const fuelNetworks = useMemo<NetworkConfig[]>(() => networks
        .filter(network => network.networkType === NetworkTypes.Fuel)
        .map((network) => ({
            chainId: Number(network.chainId),
            url: getEffectiveRpcUrls(network)[0]
        })), [networks, getEffectiveRpcUrls])

    return (
        <FuelProvider
            uiConfig={{ suggestBridge: false }}
            theme="dark"
            fuelConfig={fuelConfig}
            networks={fuelNetworks.length ? fuelNetworks : undefined}
        >
            {children}
        </FuelProvider>
    );
};


export default FuelProviderWrapper;
