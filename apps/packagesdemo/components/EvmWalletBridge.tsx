import { useMemo } from 'react'
import {
    useRegisterWallet,
    chainNamespace,
    type TrainWalletAdapter,
    type Caip2Id,
} from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useAccount, useChainId, useConfig } from 'wagmi'
import { getWalletClient, getConnections } from 'wagmi/actions'
import { sepolia, mainnet } from 'wagmi/chains'
import type { Chain } from 'viem'

const CHAIN_BY_ID: Record<number, Chain> = {
    [sepolia.id]: sepolia,
    [mainnet.id]: mainnet,
}

/**
 * Bridges wagmi wallet to Train Protocol's wallet adapter system.
 * Renders nothing — just registers the EVM adapter (client factories + login).
 */
export function EvmWalletBridge() {
    const config = useConfig()
    const { address: connectedAddress } = useAccount()
    const currentChainId = useChainId()

    const adapter = useMemo<TrainWalletAdapter>(() => {
        function getRpcUrl(caip2Id: Caip2Id): string {
            const chainId = Number((caip2Id as string).split(':')[1])
            const url = CHAIN_BY_ID[chainId]?.rpcUrls.default.http[0]
            if (!url) throw new Error(`No RPC configured for ${caip2Id}`)
            return url
        }

        function getSigner(caip2Id: Caip2Id, signerAddress?: string) {
            const address = signerAddress ?? connectedAddress
            if (!address) return null

            const chainId = Number((caip2Id as string).split(':')[1])
            const chain = CHAIN_BY_ID[chainId]
            const connection = getConnections(config)
                .find(c => c.accounts.some(a => a.toLowerCase() === address.toLowerCase()))

            return {
                address,
                chainNamespace: 'eip155',
                sendTransaction: async (tx: { to: string; data: string; value?: bigint }) => {
                    if (!chain) throw new Error(`No chain configured for ${caip2Id}`)

                    // Proactively switch the wallet to the target chain so viem doesn't
                    // throw ChainMismatchError when the wallet sits on a different chain.
                    if (connection?.connector?.switchChain) {
                        const activeId = await connection.connector.getChainId?.()
                        if (activeId !== chain.id) {
                            await connection.connector.switchChain({ chainId: chain.id })
                        }
                    }

                    const walletClient = await getWalletClient(config, {
                        chainId,
                        account: address as `0x${string}`,
                        connector: connection?.connector,
                    })

                    const send = () => walletClient.sendTransaction({
                        to: tx.to as `0x${string}`,
                        data: tx.data as `0x${string}`,
                        value: tx.value,
                        chain,
                        account: walletClient.account,
                    })

                    try {
                        return await send()
                    } catch (e) {
                        // Some wallets race the switch — retry once after explicit switch.
                        const isChainMismatch = e instanceof Error && (
                            e.name === 'ChainMismatchError' ||
                            (e.cause instanceof Error && e.cause.name === 'ChainMismatchError')
                        )
                        if (isChainMismatch && connection?.connector?.switchChain) {
                            await connection.connector.switchChain({ chainId: chain.id })
                            return await send()
                        }
                        throw e
                    }
                },
            }
        }

        return {
            chainNamespace: chainNamespace('eip155'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                return sdk.createHTLCPublicClient('eip155', { rpcUrl: getRpcUrl(networkId) })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, address?: string) {
                const signer = getSigner(networkId, address)
                if (!signer) throw new Error('No EVM signer available')
                return sdk.createHTLCWalletClient('eip155', { rpcUrl: getRpcUrl(networkId), signer })
            },

            getLoginConfig: async (address?: string) => {
                const targetAddress = address ?? connectedAddress
                if (!targetAddress) return null

                const connection = getConnections(config)
                    .find(c => c.accounts.some(a => a.toLowerCase() === targetAddress.toLowerCase()))
                if (!connection?.connector) return null

                const provider = await connection.connector.getProvider()
                const sandbox = currentChainId !== 1
                return {
                    provider,
                    address: targetAddress,
                    options: { sandbox, currentChainId },
                }
            },
        }
    }, [config, connectedAddress, currentChainId])

    useRegisterWallet(adapter)
    return null
}
