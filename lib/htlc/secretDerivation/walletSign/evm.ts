// lib/htlc/secretDerivation/walletSign/evm.ts

import { signTypedData } from '@wagmi/core';
import { Config } from 'wagmi';
import { deriveKeyMaterial } from '../keyDerivation';

const IDENTITY_SALT = 'train-identity-v1';

// EIP-712 typed data for signature (chainId=1 for consistent signatures across chains)
export const getEvmTypedData = () => ({
  domain: {
    name: 'Train',
    version: '1',
    chainId: 1,
  },
  types: {
    Message: [
      { name: 'content', type: 'string' },
    ],
  },
  primaryType: 'Message' as const,
  message: {
    content: 'I am using TRAIN',
  },
});

// Derive key from EVM wallet signature
export const deriveKeyFromEvmSignature = async (
  config: Config,
  address: `0x${string}`
): Promise<Buffer> => {
  const { domain, types, primaryType, message } = getEvmTypedData();

  const signature = await signTypedData(config, {
    account: address,
    domain,
    types,
    primaryType,
    message,
  });

  // Use full signature as input key material
  const signatureHex = signature.startsWith('0x') ? signature.slice(2) : signature;
  const inputMaterial = Buffer.from(signatureHex, 'hex');
  const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');

  return Buffer.from(deriveKeyMaterial(inputMaterial, identitySalt));
};
