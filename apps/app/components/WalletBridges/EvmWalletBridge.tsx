import { useMemo } from 'react'
import { useRegisterWallet, chainNamespace, type TrainWalletAdapter, type Caip2Id, } from '@train-protocol/react'
import type { TrainSDK } from '@train-protocol/sdk'
import { useConfig } from 'wagmi'
import { getAccount, getWalletClient, getConnections } from 'wagmi/actions'
import { useSettingsState } from '@/context/settings'
import resolveChain from '@/lib/resolveChain'
import { useBridgeRpcUrl } from './useBridgeRpcUrl'

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'

export function EvmWalletBridge() {
    const config = useConfig()
    const { networks } = useSettingsState()
    // EVM has no namespace fallback — an explicit caip2Id is always required.
    const getRpcUrl = useBridgeRpcUrl(null)

    const adapter = useMemo<TrainWalletAdapter>(() => {

        function getSignerForNetwork(caip2Id: Caip2Id, signerAddress?: string) {
            const address = signerAddress ?? getAccount(config).address
            if (!address) return null

            const network = networks.find(n => n.caip2Id === (caip2Id as string))
            const chain = network ? resolveChain(network) : undefined

            const connection = getConnections(config)
                .find(c => c.accounts.some(a => a.toLowerCase() === address.toLowerCase()))

            // When an explicit address was requested, fail fast if no connector found
            if (signerAddress && !connection) {
                throw new Error(`No connected EVM wallet found for address "${signerAddress}"`)
            }

            return {
                address,
                chainNamespace: 'eip155',
                sendTransaction: async (tx: { to: string; data: string; value?: bigint }) => {
                    if (!chain?.id) throw new Error("No chain id")

                    const walletClient = await getWalletClient(config, {
                        chainId: chain.id,
                        account: address as `0x${string}`,
                        connector: connection?.connector,
                    })

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
                        if (isChainMismatch && connection?.connector?.switchChain && chain) {
                            await connection.connector.switchChain({ chainId: chain.id })
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

        return {
            chainNamespace: chainNamespace('eip155'),

            createClient(sdk: TrainSDK, networkId: Caip2Id) {
                const rpcUrl = getRpcUrl(networkId)
                return sdk.createHTLCPublicClient('eip155', { rpcUrl })
            },

            createWriteClient(sdk: TrainSDK, networkId: Caip2Id, address?: string) {
                const rpcUrl = getRpcUrl(networkId)
                const signer = getSignerForNetwork(networkId, address)
                if (!signer) throw new Error('No EVM signer available')
                return sdk.createHTLCWalletClient('eip155', { rpcUrl, signer })
            },

            getLoginConfig: async (address?: string) => {
                const targetAddress = address ?? getAccount(config).address
                if (!targetAddress) return null

                const connection = getConnections(config)
                    .find(c => c.accounts.some(a => a.toLowerCase() === targetAddress.toLowerCase()))
                if (!connection?.connector) return null

                const provider = await connection.connector.getProvider()
                return {
                    provider,
                    address: targetAddress,
                    options: { sandbox: isSandbox, currentChainId: getAccount(config).chainId },
                }
            },
        }
    }, [config, networks, getRpcUrl])

    useRegisterWallet(adapter)
    return null
}
