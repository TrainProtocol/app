import { createContext, useContext, useCallback, ReactNode } from 'react'
import { useConfig } from 'wagmi'
import { useAztecWalletContext } from '@/components/WalletProviders/AztecWalletProvider'
import { deriveKeyFromEvmSignature } from '@/lib/htlc/secretDerivation/walletSign/evm'
import { deriveKeyFromWallet } from '@train-protocol/sdk'
import { deriveKeyFromStarknetSignature } from '@/lib/htlc/secretDerivation/walletSign/starknet'
import useWallet from '@/hooks/useWallet'
import { useSolanaWalletStore } from '@/stores/solanaWalletStore'
interface WalletLoginContextValue {
  deriveKey: (providerName: string, address: string) => Promise<Buffer>
}

const WalletLoginContext = createContext<WalletLoginContextValue | undefined>(undefined)

export function WalletLoginProvider({ children }: { children: ReactNode }) {
  const evmConfig = useConfig()
  const { getWallet: getAztecWallet } = useAztecWalletContext()
  const { wallets } = useWallet()

  const deriveKey = useCallback(
    async (providerName: string, address: string): Promise<Buffer> => {
      const provider = providerName.toLowerCase()

      if (provider === 'evm') {
        return deriveKeyFromEvmSignature(evmConfig, address as `0x${string}`)
      }

      if (provider === 'aztec') {
        const aztecWallet = getAztecWallet()
        if (!aztecWallet) throw new Error('Aztec wallet required for Aztec wallets')
        return deriveKeyFromWallet('aztec', {
          wallet: aztecWallet,
          address,
        })
      }

      if (provider === 'starknet') {
        const starknetWallet = wallets.find(wallet => wallet.providerName === 'Starknet')
        const starknetAccount = starknetWallet?.metadata?.starknetAccount
        console.log('starknetAccount', starknetAccount)
        if (!starknetAccount) throw new Error('Starknet account required for Starknet wallets')
        return deriveKeyFromStarknetSignature(starknetAccount, address)
      }

      if (provider === 'solana') {
        const signMessage = useSolanaWalletStore.getState().signMessage
        if (!signMessage) throw new Error('Solana wallet is not connected')
        return deriveKeyFromWallet('solana', { wallet: { signMessage } })
      }

      throw new Error(`Unsupported wallet provider for login: ${providerName}`)
    },
    [evmConfig, getAztecWallet, wallets],
  )

  return (
    <WalletLoginContext.Provider value={{ deriveKey }}>
      {children}
    </WalletLoginContext.Provider>
  )
}

export function useWalletLoginDerivation() {
  const context = useContext(WalletLoginContext)
  if (!context) {
    throw new Error('useWalletLoginDerivation must be used within WalletLoginProvider')
  }
  return context.deriveKey
}
