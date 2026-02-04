import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Wallet } from '@/Models/WalletProvider';
import { DerivationMethod } from '@/lib/htlc/secretDerivation';

export type DerivationStatus = 'idle' | 'signing';

interface SecretDerivationState {
  // Persisted state (in localStorage)
  method: DerivationMethod | null;
  storedDerivedKey: Buffer | null;
  loginWallet: Wallet | null;
  passkeyCredentialId: string | null;

  // Transient state (not persisted)
  isPasskeySupported: boolean;
  isReady: boolean;
  derivationStatus: DerivationStatus;
  derivationMessage: string;
  isLoggedIn: boolean;

  // Actions
  logout: () => void;
}

export const useSecretDerivationStore = create<SecretDerivationState>()(
  persist(
    (set) => ({
      // Initial state
      method: null,
      storedDerivedKey: null,
      loginWallet: null,
      passkeyCredentialId: null,
      isPasskeySupported: false,
      isReady: false,
      derivationStatus: 'idle',
      derivationMessage: '',
      isLoggedIn: false,

      // Actions
      logout: () => {
        set({
          isLoggedIn: false,
          loginWallet: null,
          method: null,
          storedDerivedKey: null,
          passkeyCredentialId: null,
        });
      },
    }),
    {
      name: 'train:loginState',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        method: state.method,
        // Serialize Buffer to hex string for storage
        derivedKey: state.storedDerivedKey
          ? state.storedDerivedKey.toString('hex')
          : null,
        loginWallet: state.loginWallet
          ? {
              address: state.loginWallet.address,
              chainId: state.loginWallet.chainId,
              providerName: state.loginWallet.providerName,
              displayName: state.loginWallet.displayName,
            }
          : null,
        passkeyCredentialId: state.passkeyCredentialId,
      }),
      // Handle rehydration - convert hex string back to Buffer
      merge: (persistedState: any, currentState) => {
        const merged = { ...currentState, ...persistedState };

        // Convert derivedKey (hex string) to storedDerivedKey (Buffer)
        if (persistedState?.derivedKey && typeof persistedState.derivedKey === 'string') {
          merged.storedDerivedKey = Buffer.from(persistedState.derivedKey, 'hex');
          merged.isLoggedIn = true; // If we have a key, user is logged in
        }

        // Restore method
        if (persistedState?.method) {
          merged.method = persistedState.method;
        }

        // Restore loginWallet
        if (persistedState?.loginWallet) {
          merged.loginWallet = persistedState.loginWallet;
        }

        // Restore passkeyCredentialId
        if (persistedState?.passkeyCredentialId != null) {
          merged.passkeyCredentialId = persistedState.passkeyCredentialId;
        }

        return merged;
      },
    }
  )
);

// Convenience selectors for components that need direct access (like navbar)
export const useIsLoggedIn = () =>
  useSecretDerivationStore((state) => state.isLoggedIn);

export const useLoginMethod = () =>
  useSecretDerivationStore((state) => state.method);

export const useLoginWallet = () =>
  useSecretDerivationStore((state) => state.loginWallet);

export const useDerivationStatus = () =>
  useSecretDerivationStore((state) => ({
    status: state.derivationStatus,
    message: state.derivationMessage,
  }));

export const usePasskeyCredentialId = () =>
  useSecretDerivationStore((state) => state.passkeyCredentialId);
