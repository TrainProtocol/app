/**
 * Extract a displayable hex address from any Aztec account shape.
 * Handles: AztecAddress, Aliased<AztecAddress> (.item or .address),
 * CompleteAddress, and raw hex strings.
 *
 * Critical: AztecAddress.toString() returns "[object Object]".
 * Must use .toHexString() instead.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractAztecAddress(a: any): string {
    if (typeof a === 'string') return a;
    if (typeof a?.toHexString === 'function') return a.toHexString();
    if (typeof a?.toJSON === 'function') return String(a.toJSON());
    const inner = a?.item ?? a?.address;
    if (inner) return extractAztecAddress(inner);
    return String(a);
}
