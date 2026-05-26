export const base64URLStringToBuffer = (base64url: string): ArrayBuffer => {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};

export const bufferToBase64URLString = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const formatPasskeyIdForDisplay = (credId: string): string => {
    if (!credId || credId.length < 8) return credId;
    return `id:${credId.slice(0, 2)}...${credId.slice(-5)}`;
};

export const mapPasskeyError = (error: unknown): string => {
    const msg = error instanceof Error ? error.message : String(error);
    const msgLower = msg.toLowerCase();

    if (msgLower.includes('prf')) return "Your password manager doesn't support secure key derivation. Try a different one (iCloud, Chrome, Windows Hello).";
    if (msgLower.includes('no passkey found') || msgLower.includes('no credentials')) return 'No passkey found for this site. Would you like to create one?';
    if (msgLower.includes('cancelled') || msgLower.includes('canceled') || msgLower.includes('not allowed') || msgLower.includes('abort')) return 'Authentication cancelled. Try again when ready.';
    if (msgLower.includes('not supported') || msgLower.includes('security error')) return 'Passkeys are not supported here. Try a different browser or password manager (iCloud, Chrome, Windows Hello).';
    if (msgLower.includes('timeout')) return 'Authentication timed out. Please try again.';
    return msg;
};
