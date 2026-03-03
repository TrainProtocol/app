// context/secretDerivationContext.tsx

import { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { Wallet } from '@/Models/WalletProvider';
import {
  checkPrfSupport,
  deriveKeyWithPasskey,
  registerPasskey,
  PrfSupportResult
} from '@/lib/htlc/secretDerivation';
import { useSecretDerivationStore, DerivationStatus } from '@/stores/secretDerivationStore';
import { DerivationMethod, deriveSecretFromTimelock } from '@train-protocol/sdk';
import { useWalletLoginDerivation } from '@/context/walletLoginContext';

interface SecretDerivationContextValue {
  method: DerivationMethod | null;
  isLoggedIn: boolean;
  loginWallet: Wallet | null;
  loginWithPasskey: (options?: { forceCreate?: boolean; label?: string; crossDevice?: boolean }) => Promise<void>;
  loginWithWallet: (wallet: Wallet) => Promise<void>;
  logout: () => void;
  isPasskeySupported: boolean;
  prfSupportDetails: PrfSupportResult | null;
  deriveInitialKey: (params: DeriveKeyParams) => Promise<Buffer>;
  deriveSecret: (params: DeriveKeyParams) => Promise<{ secret: string, nonce: number }>;
  isReady: boolean;
  /** Set while user is completing passkey or wallet sign */
  derivationStatus: DerivationStatus;
  /** Message to show during signing, e.g. "Confirm with passkey" or "Please sign in your wallet" */
  derivationMessage: string;
}

interface DeriveKeyParams {
  wallet?: Wallet;
  nonce?: number;
}

const SecretDerivationContext = createContext<SecretDerivationContextValue | undefined>(undefined);

interface SecretDerivationProviderProps {
  children: ReactNode;
}

export function SecretDerivationProvider({ children }: SecretDerivationProviderProps) {
  const deriveKeyFromWalletLogin = useWalletLoginDerivation();

  // Get all state from the zustand store
  const {
    method,
    isPasskeySupported,
    prfSupportDetails,
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
    checkPrfSupport().then((result) => {
      setState({
        isPasskeySupported: result.supported,
        prfSupportDetails: result,
        isReady: true,
      });
    });
  }, [setState]);

  const loginWithPasskey = useCallback(async (options?: { forceCreate?: boolean; label?: string; crossDevice?: boolean }) => {
    setState({ derivationStatus: 'signing', derivationMessage: 'Confirm with your passkey' });
    try {
      let key: Buffer;
      let credentialId: string;

      if (options?.forceCreate) {
        // Force create a new passkey (tries PRF during creation for single-prompt flow)
        const result = await registerPasskey(true, options.label);
        if (result.key) {
          key = result.key;
          credentialId = result.credentialId;
        } else {
          // PRF not available during creation, need one more prompt
          ({ key, credentialId } = await deriveKeyWithPasskey());
        }
      } else {
        // crossDevice: only authenticate with existing passkey (no auto-creation)
        // Normal: use existing passkey or create if missing
        ({ key, credentialId } = await deriveKeyWithPasskey({ createIfMissing: !options?.crossDevice }));
      }

      setState({
        method: 'passkey',
        isLoggedIn: true,
        loginWallet: null,
        storedDerivedKey: key,
      });
      useSecretDerivationStore.getState().addPasskeyCredential(credentialId);
    } finally {
      setState({ derivationStatus: 'idle', derivationMessage: '' });
    }
  }, [setState]);

  const loginWithWallet = useCallback(async (wallet: Wallet) => {
    const providerName = wallet.providerName?.toLowerCase();
    if (!providerName) throw new Error('Wallet has no provider name');
    setState({ derivationStatus: 'signing', derivationMessage: 'Please sign in your wallet' });
    try {
      const derivedKey = await deriveKeyFromWalletLogin(providerName, wallet.address);
      setState({
        method: 'wallet_sign',
        isLoggedIn: true,
        loginWallet: wallet,
        storedDerivedKey: derivedKey,
      });
    } finally {
      setState({ derivationStatus: 'idle', derivationMessage: '' });
    }
  }, [setState, deriveKeyFromWalletLogin]);

  const deriveInitialKey = useCallback(async (params: DeriveKeyParams): Promise<Buffer> => {
    const { wallet } = params;

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
      setState({ storedDerivedKey: key });
      useSecretDerivationStore.getState().addPasskeyCredential(credentialId);
      return key;
    }

    // Wallet sign method
    if (!wallet) {
      throw new Error('Wallet required for wallet_sign method');
    }

    const providerName = wallet.providerName?.toLowerCase();
    if (!providerName) throw new Error('Wallet has no provider name');

    return await deriveKeyFromWalletLogin(providerName, wallet.address);
  }, [method, storedDerivedKey, setState, deriveKeyFromWalletLogin]);

  const deriveSecret = useCallback(async (params: DeriveKeyParams): Promise<{ secret: string, nonce: number }> => {
    setState({
      derivationStatus: 'signing',
      derivationMessage: method === 'passkey'
        ? 'Confirm with your passkey'
        : 'Please sign in your wallet'
    });
    try {
      const { nonce, ...keyParams } = params;
      const timestamp = nonce ?? Date.now();
      const initialKey = await deriveInitialKey(keyParams);
      const derivedKey = deriveSecretFromTimelock(initialKey, timestamp);
      return { secret: '0x' + derivedKey.toString('hex'), nonce: timestamp };
    } finally {
      setState({ derivationStatus: 'idle', derivationMessage: '' });
    }
  }, [deriveInitialKey, method, setState]);

  const value: SecretDerivationContextValue = {
    method,
    isLoggedIn,
    loginWallet,
    loginWithPasskey,
    loginWithWallet,
    logout,
    isPasskeySupported,
    prfSupportDetails,
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
