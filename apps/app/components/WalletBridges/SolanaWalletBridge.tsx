import { useMemo } from 'react'
import { useRegisterWallet, chainNamespace, type TrainWalletAdapter, type Caip2Id, } from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import type { Transaction, VersionedTransaction } from '@solana/web3.js'
import { svmAdapterManager } from '@layerswap/wallet-svm'
import { Address } from '@/lib/address'
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

type SvmSignerAdapter = {
    connected?: boolean
    publicKey?: { toBase58(): string } | null
    signMessage?: (message: Uint8Array) => Promise<Uint8Array>
    signTransaction?: <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>
}

const resolveSignerAdapter = (address?: string): SvmSignerAdapter | undefined => {
    if (!address) return svmAdapterManager.getActiveSignerAdapter() as SvmSignerAdapter | undefined

    return (svmAdapterManager.getAdapters() as unknown as SvmSignerAdapter[]).find(candidate =>
        candidate.connected
        && typeof candidate.signTransaction === 'function'
        && !!candidate.publicKey
        && Address.equals(candidate.publicKey.toBase58(), address, null, 'solana')
    )
}

export function SolanaWalletBridge() {
    const getRpcUrl = useBridgeRpcUrl('solana:')

    const adapter = useMemo<TrainWalletAdapter>(() => {
        return {
            chainNamespace: chainNamespace('solana'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCPublicClient('solana', { rpcUrl: getRpcUrl(networkId) })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, address?: string) {
                const rpcUrl = getRpcUrl(networkId)
                const walletAdapter = resolveSignerAdapter(address)
                const publicKey = walletAdapter?.publicKey?.toBase58()
                if (address && (!walletAdapter || !publicKey)) {
                    throw new Error(`No connected Solana wallet found for address "${address}"`)
                }
                if (!walletAdapter || !publicKey) throw new Error('No Solana signer available')
                const signTransaction = walletAdapter.signTransaction
                if (!signTransaction) throw new Error('Connected Solana wallet cannot sign transactions')

                const signer = {
                    publicKey,
                    signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) => signTransaction.call(walletAdapter, tx),
                }

                return sdk.createHTLCWalletClient('solana', { rpcUrl, signer })
            },

            getLoginConfig: (address?: string) => {
                const walletAdapter = resolveSignerAdapter(address)
                if (!walletAdapter?.signMessage || !walletAdapter.publicKey) return null
                const signMessage = walletAdapter.signMessage
                return { wallet: { signMessage: (message: Uint8Array) => signMessage.call(walletAdapter, message) } }
            },
        }
    }, [getRpcUrl])

    useRegisterWallet(adapter)
    return null
}