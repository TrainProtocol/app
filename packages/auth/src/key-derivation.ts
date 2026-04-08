import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const IDENTITY_SALT = 'train-identity-v1';
const HKDF_INFO = new TextEncoder().encode('train-signature-key-derivation');
const KEY_LENGTH = 32;

export const deriveKeyMaterial = (
    ikm: Uint8Array,
    salt: Uint8Array
): Uint8Array => hkdf(sha256, ikm, salt, HKDF_INFO, KEY_LENGTH);
