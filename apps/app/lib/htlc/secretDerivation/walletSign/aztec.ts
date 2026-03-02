import { deriveKeyMaterial, IDENTITY_SALT } from '@train-protocol/sdk';

/**
 * Derive a deterministic login key from an Aztec wallet.
 *
 * Uses createAuthWit to produce a signature over a fixed message,
 * then derives key material from that signature — analogous to the EVM
 * approach using eth_signTypedData_v4.
 */
export const deriveKeyFromAztecWallet = async (
    aztecWallet: any,
    address: string,
): Promise<Buffer> => {
    if (!aztecWallet) {
        throw new Error('Aztec wallet not connected');
    }

    const { Fr } = await import('@aztec/aztec.js/fields');
    const { AztecAddress } = await import('@aztec/aztec.js/addresses');

    // Create a deterministic inner hash from a fixed message.
    // Same conceptual message as EVM ("I am using TRAIN").
    const messageBytes = new TextEncoder().encode('I am using TRAIN');
    const hashBuffer = await crypto.subtle.digest('SHA-256', messageBytes);
    const innerHash = Fr.fromBuffer(Buffer.from(hashBuffer));

    const accountAddress = AztecAddress.fromString(address);

    // createAuthWit(from, intent) produces a signature (the "witness") over the message
    const authWitness = await aztecWallet.createAuthWit(
        accountAddress,
        { consumer: accountAddress, innerHash },
    );

    // Serialize the witness into bytes for key derivation
    const witnessBuffer = authWitness.toBuffer();

    const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');
    return Buffer.from(deriveKeyMaterial(witnessBuffer, identitySalt));
};
