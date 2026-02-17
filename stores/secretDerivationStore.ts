import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Wallet } from '@/Models/WalletProvider';
import { DerivationMethod } from '@/lib/htlc/secretDerivation';

export type DerivationStatus = 'idle' | 'signing';

export interface PrfSupportResult {
  supported: boolean;
  reason?: string;
  platformAuthenticatorAvailable: boolean;
  prfCapabilityReported: boolean | null;
  platformHint?: 'windows_hello_no_prf' | 'unsupported_browser';
}

interface SecretDerivationState {
  // Persisted state (in localStorage)
  method: DerivationMethod | null;
  storedDerivedKey: Buffer | null;
  loginWallet: Wallet | null;
  passkeyCredentialIds: string[];
  activePasskeyCredentialId: string | null;

  // Transient state (not persisted)
  isPasskeySupported: boolean;
  prfSupportDetails: PrfSupportResult | null;
  isReady: boolean;
  derivationStatus: DerivationStatus;
  derivationMessage: string;
  isLoggedIn: boolean;

  // Actions
  logout: () => void;
  addPasskeyCredential: (credId: string) => void;
  removePasskeyCredential: (credId: string) => void;
}

export const useSecretDerivationStore = create<SecretDerivationState>()(
  persist(
    (set) => ({
      // Initial state
      method: null,
      storedDerivedKey: null,
      loginWallet: null,
      passkeyCredentialIds: [],
      activePasskeyCredentialId: null,
      isPasskeySupported: false,
      prfSupportDetails: null,
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
          activePasskeyCredentialId: null,
          // Keep passkeyCredentialIds so user can log back in
        });
      },
      addPasskeyCredential: (credId: string) => {
        set((state) => {
          const ids = state.passkeyCredentialIds.includes(credId)
            ? state.passkeyCredentialIds
            : [...state.passkeyCredentialIds, credId];
          return {
            passkeyCredentialIds: ids,
            activePasskeyCredentialId: credId,
          };
        });
      },
      removePasskeyCredential: (credId: string) => {
        set((state) => {
          const ids = state.passkeyCredentialIds.filter(id => id !== credId);
          const active = state.activePasskeyCredentialId === credId
            ? (ids[0] ?? null)
            : state.activePasskeyCredentialId;
          return {
            passkeyCredentialIds: ids,
            activePasskeyCredentialId: active,
          };
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
        passkeyCredentialIds: state.passkeyCredentialIds,
        activePasskeyCredentialId: state.activePasskeyCredentialId,
        // Keep old key for backward compat during write
        passkeyCredentialId: state.activePasskeyCredentialId,
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

        // BACKWARD COMPAT: migrate old single-credential format
        if (persistedState?.passkeyCredentialId && !persistedState?.passkeyCredentialIds) {
          merged.passkeyCredentialIds = [persistedState.passkeyCredentialId];
          merged.activePasskeyCredentialId = persistedState.passkeyCredentialId;
        }

        // Restore new format
        if (persistedState?.passkeyCredentialIds) {
          merged.passkeyCredentialIds = persistedState.passkeyCredentialIds;
        }
        if (persistedState?.activePasskeyCredentialId) {
          merged.activePasskeyCredentialId = persistedState.activePasskeyCredentialId;
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
  useSecretDerivationStore((state) => state.activePasskeyCredentialId);

export const usePasskeyCredentialIds = () =>
  useSecretDerivationStore((state) => state.passkeyCredentialIds);
