// lib/htlc/secretDerivation/walletSign/evm.ts

import { getAccount } from '@wagmi/core';
import { Config } from 'wagmi';
import { deriveKeyMaterial, IDENTITY_SALT } from '../keyDerivation';

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox';
const SIGNING_CHAIN_ID = isSandbox ? 11155111 : 1;
const SIGNING_CHAIN_HEX = isSandbox ? '0xAA36A7' : '0x1';
const SIGNING_CHAIN_NAME = isSandbox ? 'Sepolia' : 'Mainnet';

// EIP-712 typed data for signature (chainId=1 for consistent signatures across chains)
export const getEvmTypedData = () => ({
  domain: {
    name: 'Train',
    version: '1',
    chainId: SIGNING_CHAIN_ID,
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
  if (account.chainId !== SIGNING_CHAIN_ID) {
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: SIGNING_CHAIN_HEX }] });
    } catch {
      throw new Error(`Please switch to ${SIGNING_CHAIN_NAME} in your wallet and try again`);
    }
  }

  let signature: string;
  try {
    signature = await provider.request({
      method: 'eth_signTypedData_v4',
      params: [address, JSON.stringify(getEvmTypedData())],
    });
  } catch {
    throw new Error(`Signing failed. Please switch to ${SIGNING_CHAIN_NAME} in your wallet and try again`);
  }

  const signatureHex = signature.startsWith('0x') ? signature.slice(2) : signature;
  const inputMaterial = Buffer.from(signatureHex, 'hex');
  const identitySalt = Buffer.from(IDENTITY_SALT, 'utf8');

  return Buffer.from(deriveKeyMaterial(inputMaterial, identitySalt));
};
