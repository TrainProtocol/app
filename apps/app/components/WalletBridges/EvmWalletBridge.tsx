import { useMemo } from 'react'
import { useRegisterWallet, type TrainWalletAdapter } from '@train-protocol/react'
import { useConfig } from 'wagmi'
import { getAccount, getWalletClient, getConnections } from 'wagmi/actions'
import { useSettingsState } from '@/context/settings'
import { useRpcConfigStore } from '@/stores/rpcConfigStore'
import resolveChain from '@/lib/resolveChain'

const isSandbox = process.env.NEXT_PUBLIC_API_VERSION === 'sandbox'

export function EvmWalletBridge() {
    const config = useConfig()
    const { networks } = useSettingsState()
    const getEffectiveRpcUrls = useRpcConfigStore(s => s.getEffectiveRpcUrls)

    const adapter = useMemo<TrainWalletAdapter>(() => ({
        chainNamespace: 'eip155',

        getSigner: () => null,
        getClientConfig: () => ({}),

        getSignerForNetwork: (caip2Id: string) => {
            const account = getAccount(config)
            if (!account.address) return null

            const address = account.address
            const network = networks.find(n => n.caip2Id === caip2Id)
            const chain = network ? resolveChain(network) : undefined

            return {
                address,
                chainNamespace: 'eip155',
                sendTransaction: async (tx) => {
                    const connection = getConnections(config)
                        .find(c => c.accounts.some(a => a.toLowerCase() === address.toLowerCase()))

                    const walletClient = await getWalletClient(config, {
                        chainId: chain?.id,
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
        },

        getClientConfigForNetwork: (caip2Id: string) => {
            const network = networks.find(n => n.caip2Id === caip2Id)
            if (!network) return {}
            const rpcUrl = getEffectiveRpcUrls(network)[0] ?? network.nodes?.[0]?.url ?? ''
            return { rpcUrl }
        },

        getLoginConfig: async () => {
            const account = getAccount(config)
            if (!account.connector || !account.address) return null
            const provider = await account.connector.getProvider()
            return {
                provider,
                address: account.address,
                options: { sandbox: isSandbox, currentChainId: account.chainId },
            }
        },

    }), [config, networks, getEffectiveRpcUrls])

    useRegisterWallet(adapter)
    return null
}
