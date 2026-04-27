import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const IDENTITY_SALT = 'train-identity-v1';
const HKDF_INFO = new TextEncoder().encode('train-signature-key-derivation');
const KEY_LENGTH = 32;

/**
 * @deprecated Use `createProtectedKey` instead — it keeps key material out of JS memory.
 */
export const deriveKeyMaterial = (
    ikm: Uint8Array,
    salt: Uint8Array
): Uint8Array => hkdf(sha256, ikm, salt, HKDF_INFO, KEY_LENGTH);

/**
 * Import raw key bytes as a non-extractable HKDF CryptoKey.
 * The raw bytes are copied into an ArrayBuffer for Web Crypto;
 * the caller should zero the original Uint8Array after this call.
 * The returned CryptoKey can only be used for HKDF deriveBits — it cannot be exported or read.
 */
export const createProtectedKey = async (
    rawKey: Uint8Array,
): Promise<CryptoKey> => {
    const buf = new ArrayBuffer(rawKey.byteLength);
    new Uint8Array(buf).set(rawKey);
    return crypto.subtle.importKey(
        'raw',
        buf,
        { name: 'HKDF' },
        false, // non-extractable
        ['deriveBits'],
    );
};
