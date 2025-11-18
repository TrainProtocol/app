import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Network } from '../Models/Network'

export interface RpcConfig {
  customRpcUrls: string[]  // Changed to array to support multiple URLs
  useCustomRpc: boolean
  isValidated?: boolean
  lastValidatedAt?: number
  // For backward compatibility
  customRpcUrl?: string
}

interface RpcConfigStore {
  rpcConfigs: Record<string, RpcConfig>
  setCustomRpc: (networkId: string, config: Partial<RpcConfig>) => void
  removeCustomRpc: (networkId: string) => void
  getEffectiveRpcUrl: (network: Network) => string
  getEffectiveRpcUrls: (network: Network) => string[]  // New method to get all URLs
  isUsingCustomRpc: (networkId: string) => boolean
  clearAllCustomRpc: () => void
  addRpcUrl: (networkId: string, url: string) => void  // Add a new URL
  removeRpcUrl: (networkId: string, index: number) => void  // Remove URL at index
  updateRpcUrl: (networkId: string, index: number, url: string) => void  // Update URL at index
  reorderRpcUrls: (networkId: string, fromIndex: number, toIndex: number) => void  // Reorder URLs
}

export const useRpcConfigStore = create<RpcConfigStore>()(
  persist(
    (set, get) => ({
      rpcConfigs: {},

      setCustomRpc: (networkId: string, config: Partial<RpcConfig>) => {
        set((state) => {
          const existingConfig = state.rpcConfigs[networkId] || {}

          // Handle backward compatibility: convert single URL to array
          let customRpcUrls = config.customRpcUrls || existingConfig.customRpcUrls || []
          if (config.customRpcUrl && !config.customRpcUrls) {
            customRpcUrls = [config.customRpcUrl]
          }

          return {
            rpcConfigs: {
              ...state.rpcConfigs,
              [networkId]: {
                ...existingConfig,
                ...config,
                customRpcUrls,
                lastValidatedAt: Date.now()
              }
            }
          }
        })
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

        if (config?.useCustomRpc) {
          // Return first URL from array
          if (config.customRpcUrls && config.customRpcUrls.length > 0) {
            return config.customRpcUrls[0]
          }
          // Backward compatibility: check for old single URL
          if (config.customRpcUrl) {
            return config.customRpcUrl
          }
        }

        return network.rpcUrl
      },

      getEffectiveRpcUrls: (network: Network) => {
        const state = get()
        const config = state.rpcConfigs[network.name]

        if (config?.useCustomRpc) {
          // Return all URLs from array
          if (config.customRpcUrls && config.customRpcUrls.length > 0) {
            return config.customRpcUrls
          }
          // Backward compatibility: check for old single URL
          if (config.customRpcUrl) {
            return [config.customRpcUrl]
          }
        }

        return [network.rpcUrl]
      },

      isUsingCustomRpc: (networkId: string) => {
        const state = get()
        const config = state.rpcConfigs[networkId]
        return config?.useCustomRpc &&
          ((config.customRpcUrls && config.customRpcUrls.length > 0) || !!config.customRpcUrl)
      },

      clearAllCustomRpc: () => {
        set({ rpcConfigs: {} })
      },

      addRpcUrl: (networkId: string, url: string) => {
        set((state) => {
          const config = state.rpcConfigs[networkId] || { customRpcUrls: [], useCustomRpc: true }
          return {
            rpcConfigs: {
              ...state.rpcConfigs,
              [networkId]: {
                ...config,
                customRpcUrls: [...(config.customRpcUrls || []), url],
                useCustomRpc: true,
                lastValidatedAt: Date.now()
              }
            }
          }
        })
      },

      removeRpcUrl: (networkId: string, index: number) => {
        set((state) => {
          const config = state.rpcConfigs[networkId]
          if (!config || !config.customRpcUrls) return state

          const newUrls = [...config.customRpcUrls]
          newUrls.splice(index, 1)

          return {
            rpcConfigs: {
              ...state.rpcConfigs,
              [networkId]: {
                ...config,
                customRpcUrls: newUrls,
                useCustomRpc: newUrls.length > 0,
                lastValidatedAt: Date.now()
              }
            }
          }
        })
      },

      updateRpcUrl: (networkId: string, index: number, url: string) => {
        set((state) => {
          const config = state.rpcConfigs[networkId]
          if (!config || !config.customRpcUrls) return state

          const newUrls = [...config.customRpcUrls]
          newUrls[index] = url

          return {
            rpcConfigs: {
              ...state.rpcConfigs,
              [networkId]: {
                ...config,
                customRpcUrls: newUrls,
                lastValidatedAt: Date.now()
              }
            }
          }
        })
      },

      reorderRpcUrls: (networkId: string, fromIndex: number, toIndex: number) => {
        set((state) => {
          const config = state.rpcConfigs[networkId]
          if (!config || !config.customRpcUrls) return state

          const newUrls = [...config.customRpcUrls]
          const [removed] = newUrls.splice(fromIndex, 1)
          newUrls.splice(toIndex, 0, removed)

          return {
            rpcConfigs: {
              ...state.rpcConfigs,
              [networkId]: {
                ...config,
                customRpcUrls: newUrls,
                lastValidatedAt: Date.now()
              }
            }
          }
        })
      }
    }),
    {
      name: 'rpc-config-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ rpcConfigs: state.rpcConfigs })
    }
  )
)