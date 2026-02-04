// lib/htlc/secretDerivation/passkeyService.ts

import { sha256 } from "@noble/hashes/sha2.js";
import { deriveKeyMaterial } from './keyDerivation';
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

const IDENTITY_SALT = 'train-identity-v1';

/** Get stored passkey credential ID from the login store (for use outside React). */
export const getStoredCredentialId = (): string | null => {
  return useSecretDerivationStore.getState().passkeyCredentialId ?? null;
};

/** Store passkey credential ID in the login store (for use outside React). */
export const storeCredentialId = (credId: string): void => {
  useSecretDerivationStore.setState({ passkeyCredentialId: credId });
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

// Check if PRF extension is supported
export const checkPrfSupport = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  if (!window.PublicKeyCredential) return false;

  // Prefer PRF capability when available, but don't hard-fail if the API is missing or returns false.
  try {
    const capabilities = await PublicKeyCredential.getClientCapabilities?.();
    if (capabilities?.prf === true) return true;
  } catch {
    // Ignore capability errors and fall back to passkey availability checks.
  }

  // Fallback: if platform authenticator is available or credentials API exists, allow passkey flow.
  const uvpaa = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.();
  return Boolean(uvpaa ?? ('credentials' in navigator));
};

// Register a new passkey credential
export const registerPasskey = async (forceCreate?: boolean, displayName?: string): Promise<string> => {
  if (!forceCreate) {
    const existing = getStoredCredentialId();
    if (existing) return existing;
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
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
    attestation: 'none',
    timeout: 60000,
  };

  const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;

  if (!credential) {
    throw new Error('Failed to create passkey credential');
  }

  // Convert credential ID to base64url string
  const credentialId = bufferToBase64URLString(credential.rawId);

  storeCredentialId(credentialId);
  return credentialId;
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
    await registerPasskey();
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
