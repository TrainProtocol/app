import { createContext, useContext, useCallback, ReactNode } from 'react'
import { useConfig } from 'wagmi'
import { useAztecWalletContext } from '@/components/WalletProviders/AztecWalletProvider'
import { deriveKeyFromEvmSignature } from '@/lib/htlc/secretDerivation/walletSign/evm'
import { deriveKeyFromAztecWallet } from '@/lib/htlc/secretDerivation/walletSign/aztec'

interface WalletLoginContextValue {
  deriveKey: (providerName: string, address: string) => Promise<Buffer>
}

const WalletLoginContext = createContext<WalletLoginContextValue | undefined>(undefined)

export function WalletLoginProvider({ children }: { children: ReactNode }) {
  const evmConfig = useConfig()
  const { getWallet: getAztecWallet } = useAztecWalletContext()

  const deriveKey = useCallback(
    async (providerName: string, address: string): Promise<Buffer> => {
      const provider = providerName.toLowerCase()

      if (provider === 'eip155') {
        return deriveKeyFromEvmSignature(evmConfig, address as `0x${string}`)
      }

      if (provider === 'aztec') {
        const aztecWallet = getAztecWallet()
        if (!aztecWallet) throw new Error('Aztec wallet required for Aztec wallets')
        return deriveKeyFromAztecWallet(aztecWallet, address)
      }

      throw new Error(`Unsupported wallet provider for login: ${providerName}`)
    },
    [evmConfig, getAztecWallet],
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
