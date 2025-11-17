import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Network } from '../Models/Network'

export interface RpcConfig {
  customRpcUrl: string
  useCustomRpc: boolean
  isValidated?: boolean
  lastValidatedAt?: number
}

interface RpcConfigStore {
  rpcConfigs: Record<string, RpcConfig>
  setCustomRpc: (networkId: string, config: Partial<RpcConfig>) => void
  removeCustomRpc: (networkId: string) => void
  getEffectiveRpcUrl: (network: Network) => string
  isUsingCustomRpc: (networkId: string) => boolean
  clearAllCustomRpc: () => void
}

export const useRpcConfigStore = create<RpcConfigStore>()(
  persist(
    (set, get) => ({
      rpcConfigs: {},

      setCustomRpc: (networkId: string, config: Partial<RpcConfig>) => {
        set((state) => ({
          rpcConfigs: {
            ...state.rpcConfigs,
            [networkId]: {
              ...state.rpcConfigs[networkId],
              ...config,
              lastValidatedAt: Date.now()
            }
          }
        }))
      },

      removeCustomRpc: (networkId: string) => {
        set((state) => {
          const newConfigs = { ...state.rpcConfigs }
          delete newConfigs[networkId]
          return { rpcConfigs: newConfigs }
        })
      },

      getEffectiveRpcUrl: (network: Network) => {
        const state = get()
        const config = state.rpcConfigs[network.name]

        if (config?.useCustomRpc && config.customRpcUrl) {
          return config.customRpcUrl
        }

        return network.rpcUrl
      },

      isUsingCustomRpc: (networkId: string) => {
        const state = get()
        const config = state.rpcConfigs[networkId]
        return config?.useCustomRpc && !!config.customRpcUrl
      },

      clearAllCustomRpc: () => {
        set({ rpcConfigs: {} })
      }
    }),
    {
      name: 'rpc-config-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ rpcConfigs: state.rpcConfigs })
    }
  )
)