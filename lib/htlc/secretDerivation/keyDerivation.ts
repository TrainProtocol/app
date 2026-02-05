// lib/htlc/secretDerivation/keyDerivation.ts

import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

const HKDF_INFO = Buffer.from('train-signature-key-derivation', 'utf8');
const KEY_LENGTH = 32; // 256 bits

// Normalize hex string to even length
export const normalizeHex = (value: string): string => 
  value.length % 2 === 0 ? value : `0${value}`;

// Core HKDF derivation
export const deriveKeyMaterial = (
  ikm: Uint8Array, 
  salt: Uint8Array
): Uint8Array => hkdf(sha256, ikm, salt, HKDF_INFO, KEY_LENGTH);

// Get chain ID as hex for salt
export const getChainIdHex = (chainId: string | number): string => {
  if (typeof chainId === 'string') {
    return normalizeHex(chainId.startsWith('0x') ? chainId.slice(2) : chainId);
  }
  return normalizeHex(BigInt(chainId).toString(16));
};

// Derive secret from initial key + timelock
export const deriveSecretFromTimelock = (
  initialKey: Buffer, 
  timelock: number
): Buffer => {
  const timelockSalt = Buffer.from(normalizeHex(timelock.toString(16)), 'hex');
  return Buffer.from(deriveKeyMaterial(initialKey, timelockSalt));
};

// Convert derived key to hex secret for HTLC
export const keyToHexSecret = (derivedKey: Buffer): string => {
  return '0x' + derivedKey.toString('hex');
};

// Generate hashlock from hex secret string (e.g., "0x1234..." returned by deriveSecret)
export const secretToHashlock = (secret: string): string => {
  const secretBuffer = Buffer.from(secret.startsWith('0x') ? secret.slice(2) : secret, 'hex');
  return '0x' + Buffer.from(sha256(secretBuffer)).toString('hex');
};
