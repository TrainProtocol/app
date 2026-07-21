/**
 * Normalize a hex string for comparison: ensure a `0x` prefix and lowercase it.
 */
export const normalizeHex = (h: string): string =>
    (h.startsWith('0x') ? h : '0x' + h).toLowerCase()
