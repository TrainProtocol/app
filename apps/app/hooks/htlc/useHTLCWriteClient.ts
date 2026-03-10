import { useCallback } from 'react'
import { useConfig } from 'wagmi'
import { getWalletClient } from 'wagmi/actions'
import { getConnections } from '@wagmi/core'
import { createHTLCClient as createClient, IHTLCClient, TrainApiClient as SdkTrainApiClient } from '@train-protocol/sdk'
import type { EvmSigner } from '@train-protocol/evm'
import type { AztecSigner } from '@train-protocol/aztec'
import type { SolanaSigner } from '@train-protocol/solana'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import type { StarknetSigner } from '@train-protocol/starknet'
import { Network } from '../../Models/Network'
import { Wallet } from '@/Models/WalletProvider'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import resolveChain from '@/lib/resolveChain'
import { useAztecWalletContext } from '@/components/WalletProviders/AztecWalletProvider'
import AppSettings from '@/lib/AppSettings'

const apiClient = new SdkTrainApiClient({ baseUrl: AppSettings.TrainApiUri ?? '' })

/** Hook that returns a factory for creating HTLC write clients with a signer */
export function useHTLCWriteClient() {
    const config = useConfig()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)
    const { wallet: aztecWallet, accountAddress: aztecAccountAddress } = useAztecWalletContext()
    const { connection: solanaConnection } = useConnection()
    const { wallets: solanaWallets } = useWallet()

    return useCallback(async (network: Network, wallet?: Wallet): Promise<IHTLCClient> => {
        const chainType = network.caip2Id.split(':')[0]
        const rpcUrl = getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''

        // Solana chain path
        if (chainType === 'solana') {
            let signer: SolanaSigner | undefined
            const connectedWallet = solanaWallets.find(w => w.adapter.connected)
            const connectedPublicKey = connectedWallet?.adapter.publicKey
            if (connectedWallet && connectedPublicKey) {
                signer = {
                    publicKey: connectedPublicKey.toBase58(),
                    sendTransaction: async (tx) => connectedWallet.adapter.sendTransaction(tx as any, solanaConnection),
                }
            } else {
                console.error('[useHTLCWriteClient] Solana signer unavailable', { hasPubkey: !!connectedPublicKey })
            }
            return createClient(chainType, { rpcUrl, signer, apiClient })
        }

        // Aztec chain path
        if (chainType === 'aztec') {
            let signer: AztecSigner | undefined
            if (aztecWallet && aztecAccountAddress) {
                signer = {
                    wallet: aztecWallet,
                    address: aztecAccountAddress,
                }
            }
            return createClient(chainType, { rpcUrl, signer, apiClient })
        }

        // Starknet chain path
        if (chainType === 'starknet') {
            let signer: StarknetSigner | undefined
            const starknetAccount = wallet?.metadata?.starknetAccount
            if (wallet?.address && starknetAccount) {
                signer = {
                    address: wallet.address,
                    account: starknetAccount,
                }
            }
            return createClient(chainType, { rpcUrl, signer, apiClient })
        }

        // EVM chain path
        const chain = resolveChain(network)
        let signer: EvmSigner | undefined
        if (wallet?.address && chain) {
            const connector = getConnections(config)
                .find(c => c.connector.name === wallet.id)
                ?.connector

            const walletClient = await getWalletClient(config, {
                chainId: chain.id,
                account: wallet.address as `0x${string}`,
                connector,
            })
            signer = {
                address: walletClient.account.address,
                sendTransaction: async (tx) => {
                    try {
                        return await walletClient.sendTransaction({
                            to: tx.to as `0x${string}`,
                            data: tx.data as `0x${string}`,
                            value: tx.value,
                            chain,
                            account: walletClient.account,
                        })
                    } catch (e) {
                        const isChainMismatch = e instanceof Error && (
                            e.name === 'ChainMismatchError' ||
                            (e.cause instanceof Error && e.cause.name === 'ChainMismatchError')
                        )
                        if (isChainMismatch && connector?.switchChain) {
                            await connector.switchChain({ chainId: chain.id })
                            return await walletClient.sendTransaction({
                                to: tx.to as `0x${string}`,
                                data: tx.data as `0x${string}`,
                                value: tx.value,
                                chain,
                                account: walletClient.account,
                            })
                        }
                        throw e
                    }
                },
            }
        }

        return createClient(chainType, { rpcUrl, signer, apiClient })
    }, [config, getEffectiveRpcUrls, aztecWallet, aztecAccountAddress, solanaWallets, solanaConnection])
}
