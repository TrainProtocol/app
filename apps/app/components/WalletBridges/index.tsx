"use client"

import dynamic from "next/dynamic"
import { EvmWalletBridge } from './EvmWalletBridge'
import useWallet from '@/hooks/useWallet'

const AztecWalletBridge = dynamic(() => import('./AztecWalletBridge').then(module => module.AztecWalletBridge), { ssr: false })
const SolanaWalletBridge = dynamic(() => import('./SolanaWalletBridge').then(module => module.SolanaWalletBridge), { ssr: false })
const StarknetWalletBridge = dynamic(() => import('./StarknetWalletBridge').then(module => module.StarknetWalletBridge), { ssr: false })
const TronWalletBridge = dynamic(() => import('./TronWalletBridge').then(module => module.TronWalletBridge), { ssr: false })
const FuelWalletBridge = dynamic(() => import('./FuelWalletBridge').then(module => module.FuelWalletBridge), { ssr: false })

export function WalletBridges() {
    const { providers } = useWallet()
    const isReady = (id: string) => providers.some(provider => provider.id === id && provider.ready)

    return (
        <>
            <EvmWalletBridge />
            {isReady('aztec') && <AztecWalletBridge />}
            {isReady('solana') && <SolanaWalletBridge />}
            {isReady('starknet') && <StarknetWalletBridge />}
            {isReady('tron') && <TronWalletBridge />}
            {isReady('fuel') && <FuelWalletBridge />}
        </>
    )
}
