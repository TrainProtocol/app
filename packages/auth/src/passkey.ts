import { sha256 } from "@noble/hashes/sha2.js";
import { deriveKeyMaterial, IDENTITY_SALT } from './key-derivation'
import { DEFAULT_PASSKEY_DISPLAY_NAME, type PasskeyCredentialStorage } from './storage'
import { base64URLStringToBuffer, bufferToBase64URLString } from './utils'

/** Derive the WebAuthn `user.name` (password-manager username) from the user-chosen display name.
 *  Lowercases, collapses whitespace, and strips characters that look ugly in a username field. */
const slugifyPasskeyName = (name: string | undefined): string => {
    const trimmed = name?.trim()
    if (!trimmed) return 'train-user'
    const slug = trimmed
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9._-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^[-._]+|[-._]+$/g, '')
    return slug || 'train-user'
}

export const getPasskeyPrfSalt = (): Uint8Array => {
    const input = new TextEncoder().encode(`train-passkey-prf-salt-v1:${IDENTITY_SALT}`);
    return new Uint8Array(sha256(input));
};

export interface PrfSupportResult {
    supported: boolean;
    reason?: string;
    platformAuthenticatorAvailable: boolean;
    prfCapabilityReported: boolean | null;
    platformHint?: 'unsupported_browser';
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
        }
    } catch { /* API not available */ }

    if (result.prfCapabilityReported === true) {
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
    } else {
        result.reason = 'PRF not supported by this browser';
    }

    return result;
};

export interface RegisterPasskeyResult {
    credentialId: string;
    key?: Uint8Array;
}

export const registerPasskey = async (
    forceCreate?: boolean,
    displayName?: string,
    storage?: PasskeyCredentialStorage
): Promise<RegisterPasskeyResult> => {
    if (!forceCreate && storage) {
        const existing = await storage.getActiveCredentialId();
        if (existing) return { credentialId: existing };
    }

    if (typeof window === 'undefined') throw new Error('Passkey registration must run in a browser');
    if (!window.isSecureContext) throw new Error('Passkeys require HTTPS (secure context)');

    const challengeBytes = new Uint8Array(32);
    window.crypto.getRandomValues(challengeBytes);

    const userIdBytes = new Uint8Array(16);
    window.crypto.getRandomValues(userIdBytes);

    const prfSalt = getPasskeyPrfSalt();

    const label = displayName?.trim() || DEFAULT_PASSKEY_DISPLAY_NAME;

    const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: challengeBytes,
        rp: { name: 'Train', id: window.location.hostname },
        user: {
            id: userIdBytes,
            name: slugifyPasskeyName(displayName),
            displayName: label,
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        attestation: 'none',
        timeout: 60000,
        extensions: { prf: { eval: { first: prfSalt } } } as any,
    };

    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
    if (!credential) throw new Error('Failed to create passkey credential');

    const credentialId = bufferToBase64URLString(credential.rawId);
    await storage?.storeCredentialId(credentialId, label);

    const ext: any = credential.getClientExtensionResults?.() ?? {};
    const prfFirst: ArrayBuffer | undefined = ext?.prf?.results?.first;

    if (prfFirst) {
        const ikm = new Uint8Array(prfFirst);
        const identitySalt = new TextEncoder().encode(IDENTITY_SALT);
        const key = new Uint8Array(deriveKeyMaterial(ikm, identitySalt));
        return { credentialId, key };
    }

    return { credentialId };
};

export const deriveKeyWithPasskey = async (
    options?: { createIfMissing?: boolean; credentialId?: string },
    storage?: PasskeyCredentialStorage
): Promise<{ key: Uint8Array; credentialId: string }> => {
    const createIfMissing = options?.createIfMissing !== false;

    if (typeof window === 'undefined') throw new Error('Passkey auth must run in a browser');
    if (!window.isSecureContext) throw new Error('Passkeys require HTTPS (secure context)');

    const prfSalt = getPasskeyPrfSalt();
    const challengeBytes = new Uint8Array(32);
    window.crypto.getRandomValues(challengeBytes);

    const publicKey: PublicKeyCredentialRequestOptions = {
        rpId: window.location.hostname,
        challenge: challengeBytes,
        userVerification: 'required',
        extensions: { prf: { eval: { first: prfSalt } } } as any,
    };

    if (options?.credentialId) {
        publicKey.allowCredentials = [{
            type: 'public-key',
            id: base64URLStringToBuffer(options.credentialId),
        }];
    }

    let cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;

    if (!cred) {
        if (!createIfMissing) throw new Error('No passkey found for this site. Create one instead.');
        const result = await registerPasskey(true, undefined, storage);
        if (result.key) return { key: result.key, credentialId: result.credentialId };
        cred = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
        if (!cred) throw new Error('Passkey authentication was cancelled or no passkey is available');
    }

    const credentialId = bufferToBase64URLString(cred.rawId);
    const ext: any = cred.getClientExtensionResults?.() ?? {};
    const prfFirst: ArrayBuffer | undefined = ext?.prf?.results?.first;

    if (!prfFirst) throw new Error('Passkey PRF extension not available in this browser/authenticator');

    const ikm = new Uint8Array(prfFirst);
    const identitySalt = new TextEncoder().encode(IDENTITY_SALT);
    const key = new Uint8Array(deriveKeyMaterial(ikm, identitySalt));

    return { key, credentialId };
};
