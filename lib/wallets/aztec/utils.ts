import { ContractArtifact, FunctionAbi, FunctionSelector, getAllFunctionAbis } from "@aztec/stdlib/abi";
import { toHex } from "viem";

export const getSelector = async (name: string, artifact: ContractArtifact): Promise<FunctionSelector> => {
    const f = artifact.functions.find(f => f.name === name);
    if (!f) throw new Error(`Function ${name} not found`);
    return await FunctionSelector.fromNameAndParameters(f.name, f.parameters);
}

export function getFunctionAbi(
    artifact: ContractArtifact,
    fnName: string,
): FunctionAbi {
    const fn = getAllFunctionAbis(artifact).find(({ name }) => name === fnName);
    if (!fn) {
        throw Error(`Function ${fnName} not found in contract ABI.`);
    }
    return fn;
}

export function generateId() {
    function generateBytes30Hex() {
        const bytes = new Uint8Array(30);
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    const id = `0x${generateBytes30Hex()}`;
    return id;
}

export function highLowToHexValidated(high: bigint, low: bigint): string {
    const MAX_128_BIT = (1n << 128n) - 1n;

    if (high < 0n || high > MAX_128_BIT) {
        throw new Error(`High value out of range. Must be 0 <= high <= ${MAX_128_BIT}`);
    }

    if (low < 0n || low > MAX_128_BIT) {
        throw new Error(`Low value out of range. Must be 0 <= low <= ${MAX_128_BIT}`);
    }

    // Combine: high << 128 + low
    const combined = (high << 128n) + low;

    // Convert to hex and pad to 64 characters
    const hexString = toHex(combined, { size: 32 });

    return hexString;

}
export function hexToHighLowValidated(hex: string): { high: bigint; low: bigint } {
    // Remove 0x prefix if present
    const cleanHex = hex.startsWith('0x') || hex.startsWith('0X')
        ? hex.slice(2)
        : hex;

    // Validate hex string
    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
        throw new Error('Invalid hex string: contains non-hexadecimal characters');
    }

    // Check length (256 bits = 64 hex chars max)
    if (cleanHex.length > 64) {
        throw new Error('Hex string too long: exceeds 256 bits');
    }

    // Pad to 64 characters
    const paddedHex = cleanHex.padStart(64, '0');

    // Convert to bigint
    const combined = BigInt('0x' + paddedHex);

    // Extract high and low parts
    const high = combined >> BigInt(128);
    const mask = (BigInt(1) << BigInt(128)) - BigInt(1);
    const low = combined & mask;

    return { high, low };
}
export function combineHighLow({ high, low }: { high: bigint, low: bigint }): bigint {
    const SHIFT = 64n;
    const MASK = (1n << SHIFT) - 1n;  // ensures low is within 64 bits
    return (high << SHIFT) | (low & MASK);
}

export function padTo32Bytes(hex30: string): string {
    // Remove 0x prefix if present
    let clean = hex30.startsWith("0x") ? hex30.slice(2) : hex30;

    // Ensure it's 60 hex characters (30 bytes)
    if (clean.length !== 60) {
        throw new Error("Input must be exactly 30 bytes (60 hex chars)");
    }

    // Pad with leading zeros to make 64 hex chars (32 bytes)
    const padded = clean.padStart(64, "0");

    // Return with 0x prefix
    return "0x" + padded;
}

export function trimTo30Bytes(hex32: string): string {
    // Remove 0x prefix if present
    let clean = hex32.startsWith("0x") ? hex32.slice(2) : hex32;

    // Ensure it's exactly 64 hex chars (32 bytes)
    if (clean.length !== 64) {
        throw new Error("Input must be exactly 32 bytes (64 hex chars)");
    }

    // Remove first 4 hex chars (2 bytes) to get 60 hex chars (30 bytes)
    const trimmed = clean.slice(4);

    // Return with 0x prefix
    return "0x" + trimmed;
}

export function hexToUint8Array(hexString: string): Uint8Array {
    // Remove 0x prefix if present
    let hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

    // Ensure even length by padding with leading zero if necessary
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }

    // Validate hex string
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
        throw new Error('Invalid hex string');
    }

    // Convert to Uint8Array
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }

    return bytes;
}

export function bigIntToHighLow(value: bigint): { high: number; low: number } {
  // Ensure we're working with a positive value for bit operations
  const absValue = value < 0n ? -value : value;
  
  // Extract low 32 bits using bitwise AND with 0xFFFFFFFF
  const low = Number(absValue & 0xFFFFFFFFn);
  
  // Extract high 32 bits by right-shifting 32 positions
  const high = Number((absValue >> 32n) & 0xFFFFFFFFn);
  
  return { high, low };
}