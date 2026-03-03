export * from './evm'
export * from './aztec'

import { getAccount } from '@wagmi/core'
import { Config } from 'wagmi'
import { deriveKeyFromWallet } from '@train-protocol/sdk'
import type { WalletLoginConfig } from '@/context/secretDerivationContext'

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'

/**
 * Unified wallet login derivation.
 * Maps provider name to the right SDK registry namespace and extracts
 * framework-specific data from config.
 */
export async function deriveKeyFromWalletLogin(
    providerName: string,
    config: WalletLoginConfig,
    address: string,
): Promise<Buffer> {
    const provider = providerName.toLowerCase()

    if (provider === 'evm') {
        if (!config.evmConfig) throw new Error('Wagmi config required for EVM wallets')
        const account = getAccount(config.evmConfig as Config)
        if (!account.connector) throw new Error('No wallet connector found')
        const evmProvider = await account.connector.getProvider() as {
            request: (args: { method: string; params: unknown[] }) => Promise<unknown>
        }
        return deriveKeyFromWallet('eip155', {
            provider: evmProvider,
            address,
            options: { sandbox: isSandbox, currentChainId: account.chainId },
        })
    }

    if (provider === 'aztec') {
        if (!config.aztecWallet) throw new Error('Aztec wallet required for Aztec wallets')
        return deriveKeyFromWallet('aztec', {
            wallet: config.aztecWallet,
            address,
        })
    }

    throw new Error(`Unsupported wallet provider for login: ${providerName}`)
}
