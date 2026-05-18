import { createConnector, ChainNotConfiguredError } from 'wagmi'
import {
    createPublicClient,
    http,
    SwitchChainError,
    UserRejectedRequestError,
    fromHex,
    type Address,
    type Chain,
    type Hex,
    type EIP1193Provider,
    type SignableMessage,
    type TypedDataDefinition,
} from 'viem'
import { passkeyWalletWorker } from './workerClient'
import {
    ensurePasskeyWalletLogin,
    getPasskeyWalletPrf,
    getPasskeyWalletState,
    subscribePasskeyWalletState,
} from './state'

export const TRAIN_PASSKEY_CONNECTOR_ID = 'trainWallet'
export const TRAIN_PASSKEY_CONNECTOR_NAME = 'Train Wallet'

type EthRequest = { method: string; params?: readonly unknown[] | object }
type EventName = 'accountsChanged' | 'chainChanged' | 'connect' | 'disconnect' | 'message'

function buildProvider(config: { chains: readonly Chain[] }): EIP1193Provider & {
    setChainId(id: number): void
    setAddress(addr: Address | null): void
} {
    let chainId = config.chains[0]?.id ?? 1
    let address: Address | null = null
    const listeners = new Map<EventName, Set<(...args: any[]) => void>>()

    function emit(event: EventName, ...args: any[]) {
        const set = listeners.get(event)
        if (!set) return
        for (const cb of set) {
            try { cb(...args) } catch { /* ignore listener errors */ }
        }
    }

    function getChain(id: number): Chain {
        const c = config.chains.find((x) => x.id === id)
        if (!c) throw new SwitchChainError(new ChainNotConfiguredError())
        return c
    }

    function getRpcUrlForChain(id: number): string {
        const chain = getChain(id)
        const url = chain.rpcUrls.default?.http?.[0]
        if (!url) throw new Error(`No RPC URL configured for chain ${id}`)
        return url
    }

    async function handleSendTransaction(rawParams: unknown[]): Promise<Hex> {
        if (!address) throw new UserRejectedRequestError(new Error('Passkey wallet not connected'))
        const tx = (rawParams[0] ?? {}) as {
            from?: Address
            to?: Address
            data?: Hex
            value?: Hex | bigint
            gas?: Hex | bigint
            nonce?: Hex | number
            chainId?: Hex | number
        }

        const targetChainId = tx.chainId !== undefined
            ? typeof tx.chainId === 'string' ? fromHex(tx.chainId as Hex, 'number') : Number(tx.chainId)
            : chainId

        const rpcUrl = getRpcUrlForChain(targetChainId)

        const value = tx.value === undefined ? undefined
            : typeof tx.value === 'bigint' ? tx.value
            : fromHex(tx.value as Hex, 'bigint')
        const gas = tx.gas === undefined ? undefined
            : typeof tx.gas === 'bigint' ? tx.gas
            : fromHex(tx.gas as Hex, 'bigint')
        const nonce = tx.nonce === undefined ? undefined
            : typeof tx.nonce === 'number' ? tx.nonce
            : fromHex(tx.nonce as Hex, 'number')

        // Fresh passkey assertion → raw PRF → transferred to worker.
        // Worker derives the seed, verifies the address matches the connected
        // wallet (refusing to sign if the user picked a different passkey at the
        // OS prompt), builds the tx, signs, and broadcasts.
        const expected = address
        const prf = await getPasskeyWalletPrf()
        return passkeyWalletWorker.sendTransaction(prf, expected, {
            chainId: targetChainId,
            rpcUrl,
            to: tx.to,
            data: tx.data,
            value,
            nonce,
            gas,
        })
    }

    async function handleSignTypedData(rawParams: unknown[]): Promise<Hex> {
        if (!address) throw new UserRejectedRequestError(new Error('Passkey wallet not connected'))
        const payload = rawParams[1]
        const typedData = typeof payload === 'string'
            ? JSON.parse(payload) as TypedDataDefinition
            : payload as TypedDataDefinition
        const expected = address
        const prf = await getPasskeyWalletPrf()
        return passkeyWalletWorker.signTypedData(prf, expected, typedData)
    }

    async function request({ method, params }: EthRequest): Promise<unknown> {
        const p = Array.isArray(params) ? params : params ? [params] : []
        switch (method) {
            case 'eth_chainId':
                return `0x${chainId.toString(16)}`
            case 'eth_accounts':
            case 'eth_requestAccounts':
                return address ? [address] : []
            case 'wallet_switchEthereumChain': {
                const requested = (p[0] as { chainId: Hex } | undefined)?.chainId
                if (!requested) throw new SwitchChainError(new Error('Missing chainId param'))
                const next = fromHex(requested, 'number')
                getChain(next) // throws if not configured
                chainId = next
                emit('chainChanged', `0x${chainId.toString(16)}`)
                return null
            }
            case 'eth_sendTransaction':
                return handleSendTransaction(p as unknown[])
            case 'personal_sign':
            case 'eth_sign': {
                if (!address) throw new UserRejectedRequestError(new Error('Passkey wallet not connected'))
                // personal_sign params: [data, address]; eth_sign: [address, data]
                const dataHex = (method === 'personal_sign' ? p[0] : p[1]) as Hex
                const message: SignableMessage = { raw: dataHex }
                const expected = address
                const prf = await getPasskeyWalletPrf()
                return passkeyWalletWorker.signMessage(prf, expected, message)
            }
            case 'eth_signTypedData_v4':
            case 'eth_signTypedData':
                return handleSignTypedData(p as unknown[])
            default: {
                // Forward all other RPC reads (eth_getTransactionReceipt, eth_call, etc.) to a public client.
                const rpcUrl = getRpcUrlForChain(chainId)
                const client = createPublicClient({ chain: getChain(chainId), transport: http(rpcUrl) })
                return client.request({ method, params: p } as any)
            }
        }
    }

    const provider = {
        request,
        on(event: EventName, cb: (...args: any[]) => void) {
            if (!listeners.has(event)) listeners.set(event, new Set())
            listeners.get(event)!.add(cb)
        },
        removeListener(event: EventName, cb: (...args: any[]) => void) {
            listeners.get(event)?.delete(cb)
        },
        setChainId(id: number) {
            if (id === chainId) return
            chainId = id
            emit('chainChanged', `0x${chainId.toString(16)}`)
        },
        setAddress(addr: Address | null) {
            address = addr
            if (addr) emit('accountsChanged', [addr])
            else emit('accountsChanged', [])
        },
        // The double-cast is necessary because viem's EIP1193Provider type expects
        // a strictly-typed `request` overload set we don't enumerate, plus methods
        // (`enable`, `removeAllListeners`) we don't need. The runtime surface here
        // matches what wagmi actually invokes: `request`, `on`, `removeListener`.
    } as unknown as EIP1193Provider & {
        setChainId(id: number): void
        setAddress(addr: Address | null): void
    }

    return provider
}

export function trainPasskeyConnector() {
    type Provider = ReturnType<typeof buildProvider>

    return createConnector((config) => {
        let provider: Provider | undefined
        let unsubscribe: (() => void) | undefined

        function getOrCreateProvider(): Provider {
            if (provider) return provider
            provider = buildProvider({ chains: config.chains })
            return provider
        }

        return {
            id: TRAIN_PASSKEY_CONNECTOR_ID,
            name: TRAIN_PASSKEY_CONNECTOR_NAME,
            type: TRAIN_PASSKEY_CONNECTOR_ID,
            // Disable wagmi auto-reconnect: the connector needs an explicit passkey assertion
            // before it can sign, so a silent reconnect on page load is misleading.
            reconnect: false,

            async setup() {
                if (unsubscribe) return
                unsubscribe = subscribePasskeyWalletState((s) => {
                    provider?.setAddress(s.address)
                    if (!s.address) {
                        config.emitter.emit('disconnect')
                    }
                })
            },

            async connect({ chainId: requested } = {}) {
                const p = getOrCreateProvider()
                const { address } = await ensurePasskeyWalletLogin()
                p.setAddress(address)

                let targetChainId = requested
                if (!targetChainId) targetChainId = config.chains[0]?.id
                if (!targetChainId) throw new Error('No chains configured for Train Wallet')
                if (!config.chains.find((c) => c.id === targetChainId)) {
                    targetChainId = config.chains[0]!.id
                }
                p.setChainId(targetChainId)

                return { accounts: [address], chainId: targetChainId }
            },

            async disconnect() {
                provider?.setAddress(null)
                config.emitter.emit('disconnect')
            },

            async getAccounts(): Promise<readonly Address[]> {
                const s = getPasskeyWalletState()
                return s.address ? [s.address] : []
            },

            async getChainId(): Promise<number> {
                const raw = (await getOrCreateProvider().request({ method: 'eth_chainId' })) as Hex
                return fromHex(raw, 'number')
            },

            async getProvider(): Promise<Provider> {
                return getOrCreateProvider()
            },

            async isAuthorized(): Promise<boolean> {
                return !!getPasskeyWalletState().address
            },

            async switchChain({ chainId: target }) {
                const chain = config.chains.find((c) => c.id === target)
                if (!chain) throw new SwitchChainError(new ChainNotConfiguredError())
                getOrCreateProvider().setChainId(target)
                config.emitter.emit('change', { chainId: target })
                return chain
            },

            onAccountsChanged(accounts: readonly string[]) {
                if (accounts.length === 0) {
                    config.emitter.emit('disconnect')
                } else {
                    config.emitter.emit('change', { accounts: accounts as readonly Address[] })
                }
            },

            onChainChanged(chain: string) {
                config.emitter.emit('change', { chainId: Number(chain) })
            },

            onDisconnect() {
                config.emitter.emit('disconnect')
            },
        }
    })
}
