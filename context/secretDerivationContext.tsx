// context/secretDerivationContext.tsx

import { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { Wallet } from '@/Models/WalletProvider';
import {
  DerivationMethod,
  checkPrfSupport,
  deriveKeyWithPasskey,
  registerPasskey,
  deriveSecretFromTimelock
} from '@/lib/htlc/secretDerivation';
import { deriveKeyFromEvmSignature } from '@/lib/htlc/secretDerivation/walletSign/evm';
import { useSecretDerivationStore, DerivationStatus } from '@/stores/secretDerivationStore';

interface SecretDerivationContextValue {
  method: DerivationMethod | null;
  isLoggedIn: boolean;
  loginWallet: Wallet | null;
  loginWithPasskey: (options?: { createIfMissing?: boolean }) => Promise<void>;
  loginWithNewPasskey: (label?: string) => Promise<void>;
  loginWithWallet: (config: any, wallet: Wallet) => Promise<void>;
  logout: () => void;
  isPasskeySupported: boolean;
  deriveInitialKey: (params: DeriveKeyParams) => Promise<Buffer>;
  deriveSecret: (params: DeriveSecretParams) => Promise<string>;
  isReady: boolean;
  /** Set while user is completing passkey or wallet sign */
  derivationStatus: DerivationStatus;
  /** Message to show during signing, e.g. "Confirm with passkey" or "Please sign in your wallet" */
  derivationMessage: string;
}

interface DeriveKeyParams {
  chainId: string | number;
  wallet?: Wallet;
  config?: any; // Wagmi config for EVM
  tonConnectUI?: any; // TON Connect UI
}

interface DeriveSecretParams extends DeriveKeyParams {
  timelock: number;
}

const SecretDerivationContext = createContext<SecretDerivationContextValue | undefined>(undefined);

interface SecretDerivationProviderProps {
  children: ReactNode;
}

export function SecretDerivationProvider({ children }: SecretDerivationProviderProps) {
  // Get all state from the zustand store
  const {
    method,
    isPasskeySupported,
    isReady,
    derivationStatus,
    derivationMessage,
    isLoggedIn,
    loginWallet,
    storedDerivedKey,
    logout,
  } = useSecretDerivationStore();

  // Get setState function for updating store
  const setState = useSecretDerivationStore.setState;

  // Check passkey support on mount (localStorage restore is handled by zustand persist)
  useEffect(() => {
    checkPrfSupport().then((supported) => {
      setState({ isPasskeySupported: supported, isReady: true });
    });
  }, [setState]);

  const loginWithPasskey = useCallback(async (options?: { createIfMissing?: boolean }) => {
    setState({ derivationStatus: 'signing', derivationMessage: 'Confirm with your passkey' });
    try {
      const { key, credentialId } = await deriveKeyWithPasskey(options);
      setState({
        method: 'passkey',
        isLoggedIn: true,
        loginWallet: null,
        storedDerivedKey: key,
        passkeyCredentialId: credentialId,
      });
    } finally {
      setState({ derivationStatus: 'idle', derivationMessage: '' });
    }
  }, [setState]);

  const loginWithNewPasskey = useCallback(async (label?: string) => {
    setState({ derivationStatus: 'signing', derivationMessage: 'Confirm with your passkey' });
    try {
      await registerPasskey(true, label);
      const { key, credentialId } = await deriveKeyWithPasskey();
      setState({
        method: 'passkey',
        isLoggedIn: true,
        loginWallet: null,
        storedDerivedKey: key,
        passkeyCredentialId: credentialId,
      });
    } finally {
      setState({ derivationStatus: 'idle', derivationMessage: '' });
    }
  }, [setState]);

  const loginWithWallet = useCallback(async (config: any, wallet: Wallet) => {
    if (wallet.providerName?.toLowerCase() !== 'evm') {
      throw new Error('Only EVM wallets are supported for login right now');
    }
    setState({ derivationStatus: 'signing', derivationMessage: 'Please sign in your wallet' });
    try {
      const derivedKey = await deriveKeyFromEvmSignature(config, wallet.address as `0x${string}`);
      setState({
        method: 'wallet_sign',
        isLoggedIn: true,
        loginWallet: wallet,
        storedDerivedKey: derivedKey,
      });
    } finally {
      setState({ derivationStatus: 'idle', derivationMessage: '' });
    }
  }, [setState]);

  const deriveInitialKey = useCallback(async (params: DeriveKeyParams): Promise<Buffer> => {
    const { wallet, config } = params;

    if (!method) {
      throw new Error('No derivation method selected. Please choose passkey or wallet sign.');
    }

    // If we have a stored key from login, return it directly
    if (storedDerivedKey) {
      return storedDerivedKey;
    }

    // Fallback: Re-authenticate if no stored key
    if (method === 'passkey') {
      const { key, credentialId } = await deriveKeyWithPasskey();
      setState({ storedDerivedKey: key, passkeyCredentialId: credentialId });
      return key;
    }

    // Wallet sign method
    if (!wallet) {
      throw new Error('Wallet required for wallet_sign method');
    }

    const providerName = wallet.providerName?.toLowerCase();

    if (providerName === 'evm') {
      if (!config) {
        throw new Error('Wagmi config required for EVM wallets');
      }
      return await deriveKeyFromEvmSignature(config, wallet.address as `0x${string}`);
    }

    throw new Error(`Unsupported provider: ${providerName}`);
  }, [method, storedDerivedKey, setState]);

  const deriveSecret = useCallback(async (params: DeriveSecretParams): Promise<string> => {
    setState({
      derivationStatus: 'signing',
      derivationMessage: method === 'passkey'
        ? 'Confirm with your passkey'
        : 'Please sign in your wallet'
    });
    try {
      const { timelock, ...keyParams } = params;
      const initialKey = await deriveInitialKey(keyParams);
      const derivedKey = deriveSecretFromTimelock(initialKey, timelock);
      return '0x' + derivedKey.toString('hex');
    } finally {
      setState({ derivationStatus: 'idle', derivationMessage: '' });
    }
  }, [deriveInitialKey, method, setState]);

  const value: SecretDerivationContextValue = {
    method,
    isLoggedIn,
    loginWallet,
    loginWithPasskey,
    loginWithNewPasskey,
    loginWithWallet,
    logout,
    isPasskeySupported,
    deriveInitialKey,
    deriveSecret,
    isReady,
    derivationStatus,
    derivationMessage,
  };

  return (
    <SecretDerivationContext.Provider value={value}>
      {children}
    </SecretDerivationContext.Provider>
  );
}

export function useSecretDerivation() {
  const context = useContext(SecretDerivationContext);
  if (!context) {
    throw new Error('useSecretDerivation must be used within SecretDerivationProvider');
  }
  return context;
}
