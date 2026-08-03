export function truncateDecimals(value: number, decimals = 0) {
    if (value === 0) return '0';

    const factor = Math.pow(10, decimals);
    const truncated = Math.trunc(value * factor) / factor;

    const formatted = isScientific(truncated)
        ? (!isNaN(Number(truncated))
            ? truncated.toFixed(decimals).replace(/\.?0+$/, '')
            : '')
        : truncated?.toString();

    return Number(formatted).toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals
    });
}

export function isScientific(x) {
    const s = String(x);

    // 1) If it’s already a string that “looks like” sci-notation, catch it:
    if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(s)) {
        return true;
    }

    // 2) Otherwise, convert to Number (in case it's a numeric string or other) 
    //    and see if toString() uses 'e' (lowercased for consistency):
    return Number(s).toString().toLowerCase().includes('e');
}