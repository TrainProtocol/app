import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "./utils";

const SECRET_INFO = new TextEncoder().encode('train-signature-key-derivation');

const normalizeHex = (value: string): string =>
    value.length % 2 === 0 ? value : `0${value}`;

export const deriveSecretFromTimelock = (
    initialKey: Uint8Array,
    timelock: number
): Uint8Array => {
    const timelockHex = normalizeHex(timelock.toString(16));
    const timelockSalt = new Uint8Array(timelockHex.length / 2);
    for (let i = 0; i < timelockHex.length; i += 2) {
        timelockSalt[i / 2] = parseInt(timelockHex.substring(i, i + 2), 16);
    }
    return new Uint8Array(hkdf(sha256, initialKey, timelockSalt, SECRET_INFO, 32));
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
