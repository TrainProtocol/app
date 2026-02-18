// lib/htlc/secretDerivation/passkeyService.ts

import { sha256 } from "@noble/hashes/sha2.js";
import { deriveKeyMaterial, IDENTITY_SALT } from './keyDerivation';
import { useSecretDerivationStore } from '@/stores/secretDerivationStore';

// Native base64URL utilities (replacing @simplewebauthn/browser)
const base64URLStringToBuffer = (base64url: string): ArrayBuffer => {
  // Convert base64url to base64
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const bufferToBase64URLString = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert to base64 then to base64url
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Get stored passkey credential ID from the login store (for use outside React). */
export const getStoredCredentialId = (): string | null => {
  return useSecretDerivationStore.getState().activePasskeyCredentialId ?? null;
};

/** Get all stored passkey credential IDs from the login store (for use outside React). */
export const getStoredCredentialIds = (): string[] => {
  return useSecretDerivationStore.getState().passkeyCredentialIds ?? [];
};

/** Store passkey credential ID in the login store (for use outside React). */
export const storeCredentialId = (credId: string): void => {
  useSecretDerivationStore.getState().addPasskeyCredential(credId);
};

/** Format credential ID for UI display: first 2 chars + ... + last 5 chars (e.g. id:4a...9GEP7T) */
export const formatPasskeyIdForDisplay = (credId: string): string => {
  if (!credId || credId.length < 8) return credId;
  return `id:${credId.slice(0, 2)}...${credId.slice(-5)}`;
};

// Generate PRF salt for identity derivation (not chain-specific)
export const getPasskeyPrfSalt = (): Uint8Array => {
  const input = Buffer.from(`train-passkey-prf-salt-v1:${IDENTITY_SALT}`, 'utf8');
  return new Uint8Array(sha256(input));
};

export interface PrfSupportResult {
  supported: boolean;
  reason?: string;
  platformAuthenticatorAvailable: boolean;
  prfCapabilityReported: boolean | null;
  platformHint?: 'windows_hello_no_prf' | 'unsupported_browser';
}

// Check if PRF extension is supported
export const checkPrfSupport = async (): Promise<PrfSupportResult> => {
  const result: PrfSupportResult = {
    supported: false,
    platformAuthenticatorAvailable: false,
    prfCapabilityReported: null,
  };

  if (typeof window === 'undefined' || !window.isSecureContext || !window.PublicKeyCredential) {
    result.reason = 'WebAuthn not available';
    return result;
  }

  // Check platform authenticator availability
  try {
    result.platformAuthenticatorAvailable =
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() ?? false;
  } catch { /* ignore */ }

  // Check PRF capability via getClientCapabilities (Chrome 132+)
  try {
    const capabilities = await PublicKeyCredential.getClientCapabilities?.();
    if (capabilities && 'prf' in capabilities) {
      result.prfCapabilityReported = capabilities.prf === true;
      if (capabilities.prf === true) {
        result.supported = true;
        return result;
      }
    }
  } catch { /* API not available */ }

  // Heuristic: detect Windows Hello (platform authenticator but no PRF)
  const isWindows = /windows/i.test(navigator.userAgent);
  if (isWindows && result.platformAuthenticatorAvailable && result.prfCapabilityReported !== true) {
    result.reason = 'Windows Hello does not support PRF. Use a security key instead.';
    result.platformHint = 'windows_hello_no_prf';
    // Still mark supported=true because security keys CAN do PRF on Windows
    result.supported = true;
    return result;
  }

  // If getClientCapabilities was not available, fall back to platform authenticator check
  // This is less reliable but allows passkey flow to be attempted
  if (result.prfCapabilityReported === null && result.platformAuthenticatorAvailable) {
    result.supported = true;
    result.reason = 'PRF support could not be confirmed; will attempt at auth time';
    return result;
  }

  if (!result.platformAuthenticatorAvailable) {
    result.reason = 'No platform authenticator available';
    result.platformHint = 'unsupported_browser';
  }

  return result;
};

export interface RegisterPasskeyResult {
  credentialId: string;
  key?: Buffer;
}

// Register a new passkey credential
export const registerPasskey = async (forceCreate?: boolean, displayName?: string): Promise<RegisterPasskeyResult> => {
  if (!forceCreate) {
    const existing = getStoredCredentialId();
    if (existing) return { credentialId: existing };
  }

  if (typeof window === 'undefined') {
    throw new Error('Passkey registration must run in a browser');
  }
  if (!window.isSecureContext) {
    throw new Error('Passkeys require HTTPS (secure context)');
  }

  // Generate random challenge and user ID
  const challengeBytes = new Uint8Array(32);
  window.crypto.getRandomValues(challengeBytes);

  const userIdBytes = new Uint8Array(16);
  window.crypto.getRandomValues(userIdBytes);

  // Get PRF salt and existing credentials
  const prfSalt = getPasskeyPrfSalt();
  const existingIds = getStoredCredentialIds();
  const excludeCredentials = existingIds.map(id => ({
    type: 'public-key' as const,
    id: base64URLStringToBuffer(id),
  }));

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: challengeBytes,
    rp: {
      name: 'Train',
      id: window.location.hostname
    },
    user: {
      id: userIdBytes,
      name: 'train-user',
      displayName: displayName?.trim() || 'Train user',
    },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }], // ES256
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    attestation: 'none',
    timeout: 60000,
    extensions: {
      prf: { eval: { first: prfSalt } },
    } as any,
  };

  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Failed to create passkey credential');
  }

  // Convert credential ID to base64url string
  const credentialId = bufferToBase64URLString(credential.rawId);
  storeCredentialId(credentialId);

  // Check if PRF result came back during creation
  const ext: any = credential.getClientExtensionResults?.() ?? {};
  const prfFirst: ArrayBuffer | undefined = ext?.prf?.results?.first;

  if (prfFirst) {
    // PRF worked during registration - derive key immediately
    const ikm = new Uint8Array(prfFirst);
    const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');
    const key = Buffer.from(deriveKeyMaterial(ikm, identitySalt));
    return { credentialId, key };
  }

  return { credentialId };
};

// Derive initial key using passkey PRF (works without stored credential ID)
export const deriveKeyWithPasskey = async (options?: { createIfMissing?: boolean }): Promise<{ key: Buffer; credentialId: string }> => {
  const createIfMissing = options?.createIfMissing !== false;

  if (typeof window === 'undefined') {
    throw new Error('Passkey auth must run in a browser');
  }
  if (!window.isSecureContext) {
    throw new Error('Passkeys require HTTPS (secure context)');
  }

  const prfSalt = getPasskeyPrfSalt();
  const challengeBytes = new Uint8Array(32);
  window.crypto.getRandomValues(challengeBytes);

  const publicKey: PublicKeyCredentialRequestOptions = {
    rpId: window.location.hostname,
    challenge: challengeBytes,
    userVerification: 'required',
    // Omit allowCredentials so the browser offers all passkeys for this domain
    extensions: {
      prf: { eval: { first: prfSalt } },
    } as any,
  };

  let cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;

  if (!cred) {
    if (!createIfMissing) {
      throw new Error('No passkey found for this site. Create one instead.');
    }
    // Force create — stored credential IDs may be stale (passkey deleted from device)
    const result = await registerPasskey(true);
    if (result.key) {
      return { key: result.key, credentialId: result.credentialId };
    }
    // PRF not available during creation, need a get() for PRF
    cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
    if (!cred) {
      throw new Error('Passkey authentication was cancelled or no passkey is available');
    }
  }

  const credentialId = bufferToBase64URLString(cred.rawId);

  const ext: any = cred.getClientExtensionResults?.() ?? {};
  const prfFirst: ArrayBuffer | undefined = ext?.prf?.results?.first;

  if (!prfFirst) {
    throw new Error('Passkey PRF extension not available in this browser/authenticator');
  }

  const ikm = new Uint8Array(prfFirst);
  const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');
  const key = Buffer.from(deriveKeyMaterial(ikm, identitySalt));

  return { key, credentialId };
};

// Map technical passkey errors to user-friendly messages
export const mapPasskeyError = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : String(error);
  const msgLower = msg.toLowerCase();

  if (msgLower.includes('prf extension not available') || msgLower.includes('prf')) {
    return "Your device doesn't support secure key derivation. Try using a wallet instead.";
  }
  if (msgLower.includes('no passkey found') || msgLower.includes('no credentials')) {
    return 'No passkey found for this site. Would you like to create one?';
  }
  if (msgLower.includes('cancelled') || msgLower.includes('canceled') ||
      msgLower.includes('not allowed') || msgLower.includes('abort')) {
    return 'Authentication cancelled. Try again when ready.';
  }
  if (msgLower.includes('not supported') || msgLower.includes('security error')) {
    return 'Passkeys are not supported in this browser. Try using a wallet instead.';
  }
  if (msgLower.includes('timeout')) {
    return 'Authentication timed out. Please try again.';
  }
  // Fallback
  return msg;
};
