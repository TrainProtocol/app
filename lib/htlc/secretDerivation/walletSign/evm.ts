// lib/htlc/secretDerivation/walletSign/evm.ts

import { getAccount } from '@wagmi/core';
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
  const account = getAccount(config);
  if (!account.connector) {
    throw new Error('No wallet connector found');
  }

  const provider = await account.connector.getProvider() as { request: (args: { method: string; params: unknown[] }) => Promise<string> };

  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x1' }] });
  } catch {
    throw new Error('Please switch to Ethereum Mainnet in your wallet and try again');
  }

  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [address, JSON.stringify(getEvmTypedData())],
  });

  const signatureHex = signature.startsWith('0x') ? signature.slice(2) : signature;
  const inputMaterial = Buffer.from(signatureHex, 'hex');
  const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');

  return Buffer.from(deriveKeyMaterial(inputMaterial, identitySalt));
};
