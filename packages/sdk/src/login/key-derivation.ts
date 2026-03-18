import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

export const IDENTITY_SALT = 'train-identity-v1';
const HKDF_INFO = Buffer.from('train-signature-key-derivation', 'utf8');
const KEY_LENGTH = 32;

const normalizeHex = (value: string): string =>
    value.length % 2 === 0 ? value : `0${value}`;

export const deriveKeyMaterial = (
    ikm: Uint8Array,
    salt: Uint8Array
): Uint8Array => hkdf(sha256, ikm, salt, HKDF_INFO, KEY_LENGTH);

export const deriveSecretFromTimelock = (
    initialKey: Buffer,
    timelock: number
): Buffer => {
    const timelockSalt = Buffer.from(normalizeHex(timelock.toString(16)), 'hex');
    return Buffer.from(deriveKeyMaterial(initialKey, timelockSalt));
};

export const secretToHashlock = (secret: string): string => {
    const secretBuffer = Buffer.from(secret.startsWith('0x') ? secret.slice(2) : secret, 'hex');
    return '0x' + Buffer.from(sha256(secretBuffer)).toString('hex');
};
