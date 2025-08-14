import { ContractArtifact, FunctionAbi, FunctionSelector, getAllFunctionAbis } from "@aztec/stdlib/abi";

export const getSelector = async (name: string, artifact: ContractArtifact): Promise<FunctionSelector> => {
    debugger
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

export function highLowToHexString({ high, low }: { high: bigint, low: bigint }): string {
    const PART_HEX_LEN = 16; // 64 bits = 16 hex chars

    // toString(16) → hex without leading zeros
    const highHex = high.toString(16).padStart(PART_HEX_LEN, '0');
    const lowHex = low.toString(16).padStart(PART_HEX_LEN, '0');

    return `0x${highHex}${lowHex}`;
}

export function combineHighLow({ high, low }: { high: bigint, low: bigint }): bigint {
    const SHIFT = 64n;
    const MASK = (1n << SHIFT) - 1n;  // ensures low is within 64 bits
    return (high << SHIFT) | (low & MASK);
}