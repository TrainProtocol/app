import { useMemo } from 'react'
import { useRegisterWallet } from '../wallet/useRegisterWallet'
import { useNetworksContext } from '../providers/NetworksProvider'
import type { TrainWalletAdapter } from '../wallet/types'

export interface AztecWalletBridgeProps {
    /** The connected Aztec Wallet instance (from @aztec/aztec.js or wallet-sdk) */
    wallet: unknown
    /** The connected account address */
    address: string | null | undefined
    /** Optional RPC URL override. When omitted, resolved from the first aztec: network node. */
    rpcUrl?: string
}

/**
 * Bridges an Aztec wallet into the Train protocol adapter system.
 * Renders nothing — just registers the adapter with TrainProvider.
 *
 * Usage:
 * ```tsx
 * <AztecWalletBridge wallet={aztecWallet} address={accountAddress} />
 * ```
 */
export function AztecWalletBridge({ wallet, address, rpcUrl }: AztecWalletBridgeProps) {
    const { networks } = useNetworksContext()

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: 'aztec',

        getSigner: () => {
            if (!wallet || !address) return null

            return {
                address,
                chainNamespace: 'aztec',
                sendTransaction: async () => {
                    throw new Error('Aztec uses wallet SDK, not sendTransaction')
                },
            }
        },

        getClientConfig: () => {
            const aztecNetwork = networks.find(n => n.caip2Id.startsWith('aztec:'))
            const resolvedRpcUrl = rpcUrl
                ?? aztecNetwork?.nodes?.[0]?.url
                ?? ''
            return {
                rpcUrl: resolvedRpcUrl,
                signer: wallet && address ? { wallet, address } : undefined,
            }
        },

        getLoginConfig: () => {
            if (!wallet || !address) return null
            return { wallet, address }
        },

        onSignerChange: () => {
            return () => {}
        },
    }), [wallet, address, networks, rpcUrl])

    useRegisterWallet(adapter)
    return null
}
