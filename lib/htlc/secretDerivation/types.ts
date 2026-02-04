// lib/htlc/secretDerivation/types.ts

export type DerivationMethod = 'passkey' | 'wallet_sign';

export interface SecretDerivationState {
  method: DerivationMethod | null;
  isLoggedIn: boolean;
  isPasskeySupported: boolean;
  derivationStatus: 'idle' | 'signing';
  derivationMessage: string;
}

export interface SecretDerivationActions {
  loginWithPasskey: (chainId: string | number) => Promise<void>;
  loginWithWallet: (config: any, wallet: any, chainId: number) => Promise<void>;
  logout: () => void;
  deriveInitialKey: (params: any) => Promise<Buffer>;
  deriveSecret: (params: any) => Promise<string>;
}
