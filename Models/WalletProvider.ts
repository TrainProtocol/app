import { AccountInterface } from 'starknet';
import { StarknetWindowObject } from 'starknetkit';
import { ClaimParams, CommitmentParams, CreatePreHTLCParams, GetCommitsParams, LockParams, RefundParams } from '../lib/wallets/phtlc';
import { Commit } from './PHTLC';

export type InternalConnector = {
    name: string,
    id: string,
    icon?: string | undefined,
    order?: number,
    type?: 'injected' | 'other',
    isMultiChain?: boolean,
    providerName?: string,
    installUrl?: string,
    isMobileSupported?: boolean,
}

export type Wallet = {
    id: string;
    displayName?: string;
    isActive: boolean;
    address: string | `0x${string}`;
    addresses: string[];
    providerName: string
    icon: (props: any) => React.JSX.Element;
    metadata?: {
        starknetAccount?: AccountInterface,
        wallet?: StarknetWindowObject,
        l1Address?: string,
        deepLink?: string
    }
    chainId?: string | number,
    isLoading?: boolean,
    disconnect: () => Promise<void> | undefined | void;
    connect?: () => Promise<Wallet | undefined>;
    isNotAvailable?: boolean;
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    autofillSupportedNetworks?: string[],
    networkIcon?: string,
}


export type WalletProvider = {
    hideFromList?: boolean,
    connectWallet: () => Promise<Wallet | undefined>,
    connectConnector?: (props?: { connector: InternalConnector }) => Promise<Wallet | undefined> | undefined
    switchAccount?: (connector: Wallet, address: string) => Promise<void>
    switchChain?: (connector: Wallet, chainId: string | number) => Promise<void>
    availableWalletsForConnect?: InternalConnector[],
    connectedWallets: Wallet[] | undefined,
    activeWallet: Wallet | undefined,
    autofillSupportedNetworks?: string[],
    withdrawalSupportedNetworks?: string[],
    asSourceSupportedNetworks?: string[],
    name: string,
    id: string,
    providerIcon?: string,

    createPreHTLC: (args: CreatePreHTLCParams) => Promise<{ hash: string, commitId: string } | null | undefined>,
    claim: (args: ClaimParams) => Promise<string> | undefined | void,
    refund: (args: RefundParams) => Promise<any> | undefined | void,
    getDetails: (args: CommitmentParams) => Promise<Commit | null>,
    secureGetDetails?: (args: CommitmentParams) => Promise<Commit | null>,
    addLock: (args: CommitmentParams & LockParams) => Promise<{ hash: string, result: any } | null>,
}
