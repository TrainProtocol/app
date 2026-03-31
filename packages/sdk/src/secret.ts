import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "./utils";

const SECRET_INFO = new TextEncoder().encode('train-signature-key-derivation');

const normalizeHex = (value: string): string =>
    value.length % 2 === 0 ? value : `0${value}`;

const timelockToSalt = (timelock: number): Uint8Array => {
    const timelockHex = normalizeHex(timelock.toString(16));
    const salt = new Uint8Array(timelockHex.length / 2);
    for (let i = 0; i < timelockHex.length; i += 2) {
        salt[i / 2] = parseInt(timelockHex.substring(i, i + 2), 16);
    }
    return salt;
};

/**
 * @deprecated Use `deriveSecretFromCryptoKey` with a CryptoKey instead.
 * This variant accepts raw key bytes in JS memory.
 */
export const deriveSecretFromTimelock = (
    initialKey: Uint8Array,
    timelock: number
): Uint8Array => {
    return new Uint8Array(hkdf(sha256, initialKey, timelockToSalt(timelock), SECRET_INFO, 32));
};

/**
 * Derive a per-swap secret from a non-extractable CryptoKey + timelock nonce.
 * The master key never enters JS memory — only the derived per-swap secret is returned.
 */
export const deriveSecretFromCryptoKey = async (
    masterKey: CryptoKey,
    timelock: number,
): Promise<Uint8Array> => {
    const salt = timelockToSalt(timelock);
    const saltBuf = new ArrayBuffer(salt.byteLength);
    new Uint8Array(saltBuf).set(salt);
    const infoBuf = new ArrayBuffer(SECRET_INFO.byteLength);
    new Uint8Array(infoBuf).set(SECRET_INFO);
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: saltBuf,
            info: infoBuf,
        },
        masterKey,
        256, // 32 bytes
    );
    return new Uint8Array(bits);
};

export const secretToHashlock = (secret: string): string => {
    const clean = secret.startsWith('0x') ? secret.slice(2) : secret;
    const secretBytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
        secretBytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
    }
    const hash = sha256(secretBytes);
    return bytesToHex(Array.from(hash));
};
