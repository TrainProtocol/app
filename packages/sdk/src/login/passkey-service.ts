import { sha256 } from "@noble/hashes/sha2.js";
import { deriveKeyMaterial, IDENTITY_SALT } from './key-derivation';
import { TrainError, TrainErrorCode } from '../errors';

const base64URLStringToBuffer = (base64url: string): ArrayBuffer => {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
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
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** Injectable storage interface — implement with zustand, memory, or any other store. */
export interface PasskeyCredentialStorage {
    getActiveCredentialId(): string | null
    getAllCredentialIds(): string[]
    storeCredentialId(credId: string): void
}

/** In-memory fallback storage (non-persistent). */
export class InMemoryPasskeyStorage implements PasskeyCredentialStorage {
    private credentialIds: string[] = []
    private activeId: string | null = null

    getActiveCredentialId(): string | null { return this.activeId }
    getAllCredentialIds(): string[] { return this.credentialIds }
    storeCredentialId(credId: string): void {
        if (!this.credentialIds.includes(credId)) {
            this.credentialIds.push(credId)
        }
        this.activeId = credId
    }
}

export const formatPasskeyIdForDisplay = (credId: string): string => {
    if (!credId || credId.length < 8) return credId;
    return `id: ${credId.slice(0, 2)}...${credId.slice(-5)}`;
};

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

    try {
        result.platformAuthenticatorAvailable =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable() ?? false;
    } catch { /* ignore */ }

    try {
        const capabilities = await (PublicKeyCredential as any).getClientCapabilities?.();
        if (capabilities && 'prf' in capabilities) {
            result.prfCapabilityReported = capabilities.prf === true;
            if (capabilities.prf === true) {
                result.supported = true;
                return result;
            }
        }
    } catch { /* API not available */ }

    const isWindows = /windows/i.test(navigator.userAgent);
    if (isWindows && result.platformAuthenticatorAvailable && result.prfCapabilityReported !== true) {
        result.reason = 'Windows Hello does not support PRF. Use a security key instead.';
        result.platformHint = 'windows_hello_no_prf';
        result.supported = true;
        return result;
    }

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

export const registerPasskey = async (
    forceCreate?: boolean,
    displayName?: string,
    storage?: PasskeyCredentialStorage
): Promise<RegisterPasskeyResult> => {
    if (!forceCreate && storage) {
        const existing = storage.getActiveCredentialId();
        if (existing) return { credentialId: existing };
    }

    if (typeof window === 'undefined') throw new TrainError(TrainErrorCode.PASSKEY_BROWSER_REQUIRED, 'Passkey registration must run in a browser');
    if (!window.isSecureContext) throw new TrainError(TrainErrorCode.PASSKEY_HTTPS_REQUIRED, 'Passkeys require HTTPS (secure context)');

    const challengeBytes = new Uint8Array(32);
    window.crypto.getRandomValues(challengeBytes);

    const userIdBytes = new Uint8Array(16);
    window.crypto.getRandomValues(userIdBytes);

    const prfSalt = getPasskeyPrfSalt();
    const existingIds = storage?.getAllCredentialIds() ?? [];
    const excludeCredentials = existingIds.map(id => ({
        type: 'public-key' as const,
        id: base64URLStringToBuffer(id),
    }));

    const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: challengeBytes,
        rp: { name: 'Train', id: window.location.hostname },
        user: {
            id: userIdBytes,
            name: 'train-user',
            displayName: displayName?.trim() || 'Train user',
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        excludeCredentials,
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        attestation: 'none',
        timeout: 60000,
        extensions: { prf: { eval: { first: prfSalt } } } as any,
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
    if (!credential) throw new TrainError(TrainErrorCode.PASSKEY_CREATION_FAILED, 'Failed to create passkey credential');

    const credentialId = bufferToBase64URLString(credential.rawId);
    storage?.storeCredentialId(credentialId);

    const ext: any = credential.getClientExtensionResults?.() ?? {};
    const prfFirst: ArrayBuffer | undefined = ext?.prf?.results?.first;

    if (prfFirst) {
        const ikm = new Uint8Array(prfFirst);
        const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');
        const key = Buffer.from(deriveKeyMaterial(ikm, identitySalt));
        return { credentialId, key };
    }

    return { credentialId };
};

export const deriveKeyWithPasskey = async (
    options?: { createIfMissing?: boolean },
    storage?: PasskeyCredentialStorage
): Promise<{ key: Buffer; credentialId: string }> => {
    const createIfMissing = options?.createIfMissing !== false;

    if (typeof window === 'undefined') throw new TrainError(TrainErrorCode.PASSKEY_BROWSER_REQUIRED, 'Passkey auth must run in a browser');
    if (!window.isSecureContext) throw new TrainError(TrainErrorCode.PASSKEY_HTTPS_REQUIRED, 'Passkeys require HTTPS (secure context)');

    const prfSalt = getPasskeyPrfSalt();
    const challengeBytes = new Uint8Array(32);
    window.crypto.getRandomValues(challengeBytes);

    const publicKey: PublicKeyCredentialRequestOptions = {
        rpId: window.location.hostname,
        challenge: challengeBytes,
        userVerification: 'required',
        extensions: { prf: { eval: { first: prfSalt } } } as any,
    };

    let cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;

    if (!cred) {
        if (!createIfMissing) throw new TrainError(TrainErrorCode.PASSKEY_NOT_FOUND, 'No passkey found for this site. Create one instead.');
        const result = await registerPasskey(true, undefined, storage);
        if (result.key) return { key: result.key, credentialId: result.credentialId };
        cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
        if (!cred) throw new TrainError(TrainErrorCode.PASSKEY_CANCELLED, 'Passkey authentication was cancelled or no passkey is available');
    }

    const credentialId = bufferToBase64URLString(cred.rawId);
    const ext: any = cred.getClientExtensionResults?.() ?? {};
    const prfFirst: ArrayBuffer | undefined = ext?.prf?.results?.first;

    if (!prfFirst) throw new TrainError(TrainErrorCode.PASSKEY_PRF_UNAVAILABLE, 'Passkey PRF extension not available in this browser/authenticator');

    const ikm = new Uint8Array(prfFirst);
    const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');
    const key = Buffer.from(deriveKeyMaterial(ikm, identitySalt));

    return { key, credentialId };
};

export const mapPasskeyError = (error: unknown): string => {
    const msg = error instanceof Error ? error.message : String(error);
    const msgLower = msg.toLowerCase();

    if (msgLower.includes('prf')) return "Your device doesn't support secure key derivation. Try using a wallet instead.";
    if (msgLower.includes('no passkey found') || msgLower.includes('no credentials')) return 'No passkey found for this site. Would you like to create one?';
    if (msgLower.includes('cancelled') || msgLower.includes('canceled') || msgLower.includes('not allowed') || msgLower.includes('abort')) return 'Authentication cancelled. Try again when ready.';
    if (msgLower.includes('not supported') || msgLower.includes('security error')) return 'Passkeys are not supported in this browser. Try using a wallet instead.';
    if (msgLower.includes('timeout')) return 'Authentication timed out. Please try again.';
    return msg;
};
