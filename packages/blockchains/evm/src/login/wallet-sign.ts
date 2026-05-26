import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/auth';

export interface Eip1193Provider {
    request(args: { method: string; params: unknown[] }): Promise<unknown>
}

export const getEvmTypedData = (sandbox: boolean = false) => ({
    domain: {
        name: 'Train',
        version: '1',
        chainId: sandbox ? 11155111 : 1,
    },
    types: {
        EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
        ],
        Message: [
            { name: 'content', type: 'string' },
        ],
    },
    primaryType: 'Message' as const,
    message: {
        content: 'I am using TRAIN',
    },
});

function hexToUint8Array(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

export const deriveKeyFromEvmSignature = async (
    provider: Eip1193Provider,
    address: `0x${string}`,
    options?: { sandbox?: boolean; currentChainId?: number }
): Promise<Uint8Array> => {
    const isSandbox = options?.sandbox ?? false;
    const signingChainId = isSandbox ? 11155111 : 1;
    const signingChainHex = isSandbox ? '0xAA36A7' : '0x1';
    const signingChainName = isSandbox ? 'Sepolia' : 'Mainnet';

    if (options?.currentChainId !== undefined && options.currentChainId !== signingChainId) {
        try {
            await provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: signingChainHex }],
            });
        } catch {
            throw new Error(`Please switch to ${signingChainName} in your wallet and try again`);
        }
    }

    let signature: string;
    try {
        signature = await provider.request({
            method: 'eth_signTypedData_v4',
            params: [address, JSON.stringify(getEvmTypedData(isSandbox))],
        }) as string;
    } catch {
        throw new Error(`Signing failed. Please switch to ${signingChainName} in your wallet and try again`);
    }

    const signatureHex = signature.startsWith('0x') ? signature.slice(2) : signature;
    const inputMaterial = hexToUint8Array(signatureHex);
    const identitySalt = new TextEncoder().encode(IDENTITY_SALT);

    return new Uint8Array(deriveKeyMaterial(inputMaterial, identitySalt));
};
