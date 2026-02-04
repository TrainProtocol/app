// context/secretDerivationContext.tsx

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Wallet } from '@/Models/WalletProvider';
import {
  DerivationMethod,
  checkPrfSupport,
  deriveKeyWithPasskey,
  deriveSecretFromTimelock
} from '@/lib/htlc/secretDerivation';
import { deriveKeyFromEvmSignature } from '@/lib/htlc/secretDerivation/walletSign/evm';

const LOGIN_STATE_KEY = 'train:loginState';

export type DerivationStatus = 'idle' | 'signing';

interface StoredLoginState {
  method: DerivationMethod;
  derivedKey: string; // Hex string of the derived key from login
  loginWallet?: {
    address: string;
    chainId?: string | number;
    providerName: string;
    displayName?: string;
  };
}

interface SecretDerivationContextValue {
  method: DerivationMethod | null;
  isLoggedIn: boolean;
  loginWallet: Wallet | null;
  loginWithPasskey: () => Promise<void>;
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

// LocalStorage helpers for login state persistence
const saveLoginState = (method: DerivationMethod, derivedKey: Buffer, wallet?: Wallet) => {
  if (typeof window === 'undefined') return;
  const state: StoredLoginState = {
    method,
    derivedKey: derivedKey.toString('hex'),
    ...(wallet && {
      loginWallet: {
        address: wallet.address,
        chainId: wallet.chainId,
        providerName: wallet.providerName,
        displayName: wallet.displayName,
      }
    })
  };
  window.localStorage.setItem(LOGIN_STATE_KEY, JSON.stringify(state));
};

const loadLoginState = (): StoredLoginState | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(LOGIN_STATE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const clearLoginState = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOGIN_STATE_KEY);
};

export function SecretDerivationProvider({ children }: SecretDerivationProviderProps) {
  const [method, setMethodState] = useState<DerivationMethod | null>(null);
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [derivationStatus, setDerivationStatus] = useState<DerivationStatus>('idle');
  const [derivationMessage, setDerivationMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginWallet, setLoginWallet] = useState<Wallet | null>(null);
  const [storedDerivedKey, setStoredDerivedKey] = useState<Buffer | null>(null);

  // Check passkey support and restore login state on mount
  useEffect(() => {
    checkPrfSupport().then((supported) => {
      setIsPasskeySupported(supported);
      setIsReady(true);
    });

    // Restore login state from localStorage
    const savedState = loadLoginState();
    if (savedState) {
      setMethodState(savedState.method);
      setIsLoggedIn(true);
      // Restore derived key from hex string
      setStoredDerivedKey(Buffer.from(savedState.derivedKey, 'hex'));
      if (savedState.loginWallet) {
        // Reconstruct wallet object from stored data
        setLoginWallet(savedState.loginWallet as any);
      }
    }
  }, []);

  const loginWithPasskey = useCallback(async () => {
    setDerivationStatus('signing');
    setDerivationMessage('Confirm with your passkey');
    try {
      const derivedKey = await deriveKeyWithPasskey();
      setMethodState('passkey');
      setIsLoggedIn(true);
      setLoginWallet(null);
      setStoredDerivedKey(derivedKey);
      saveLoginState('passkey', derivedKey);
    } finally {
      setDerivationStatus('idle');
      setDerivationMessage('');
    }
  }, []);

  const loginWithWallet = useCallback(async (config: any, wallet: Wallet) => {
    if (wallet.providerName?.toLowerCase() !== 'evm') {
      throw new Error('Only EVM wallets are supported for login right now');
    }
    setDerivationStatus('signing');
    setDerivationMessage('Please sign in your wallet');
    try {
      const derivedKey = await deriveKeyFromEvmSignature(config, wallet.address as `0x${string}`);
      setMethodState('wallet_sign');
      setIsLoggedIn(true);
      setLoginWallet(wallet);
      setStoredDerivedKey(derivedKey);
      saveLoginState('wallet_sign', derivedKey, wallet);
    } finally {
      setDerivationStatus('idle');
      setDerivationMessage('');
    }
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setLoginWallet(null);
    setMethodState(null);
    setStoredDerivedKey(null);
    // Clear login state from localStorage
    clearLoginState();
  }, []);

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
      return await deriveKeyWithPasskey();
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
  }, [method, storedDerivedKey]);

  const deriveSecret = useCallback(async (params: DeriveSecretParams): Promise<string> => {
    setDerivationStatus('signing');
    setDerivationMessage(
      method === 'passkey'
        ? 'Confirm with your passkey'
        : 'Please sign in your wallet'
    );
    try {
      const { timelock, ...keyParams } = params;
      const initialKey = await deriveInitialKey(keyParams);
      const derivedKey = deriveSecretFromTimelock(initialKey, timelock);
      return '0x' + derivedKey.toString('hex');
    } finally {
      setDerivationStatus('idle');
      setDerivationMessage('');
    }
  }, [deriveInitialKey, method]);

  const value: SecretDerivationContextValue = {
    method,
    isLoggedIn,
    loginWallet,
    loginWithPasskey,
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
