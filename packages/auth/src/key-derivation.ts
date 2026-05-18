import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const IDENTITY_SALT = 'train-identity-v1';
const HKDF_INFO = new TextEncoder().encode('train-signature-key-derivation');
const WALLET_SEED_HKDF_INFO = new TextEncoder().encode('train-passkey-wallet-seed-v1');
const KEY_LENGTH = 32;

export const deriveKeyMaterial = (
    ikm: Uint8Array,
    salt: Uint8Array
): Uint8Array => hkdf(sha256, ikm, salt, HKDF_INFO, KEY_LENGTH);

/**
 * Derive a 32-byte EVM private-key seed from passkey PRF output.
 * Uses the same salt (IDENTITY_SALT) as the HTLC key but a distinct HKDF info,
 * giving cryptographic domain separation while reusing a single PRF assertion.
 */
export const deriveWalletSeed = (
    ikm: Uint8Array,
    salt: Uint8Array
): Uint8Array => hkdf(sha256, ikm, salt, WALLET_SEED_HKDF_INFO, KEY_LENGTH);
