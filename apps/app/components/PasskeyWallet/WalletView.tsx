"use client"

import { FC, useCallback, useMemo, useState } from "react"
import { parseEther, isAddress, type Address, type Hex } from "viem"
import { Copy, ExternalLink, LogOut, RefreshCw, Send, Loader2, Wallet as WalletIcon } from "lucide-react"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import { useSettingsState } from "@/context/settings"
import { useRpcConfigStore } from "@/stores/rpcConfigStore"
import { NetworkTypes, getNativeToken, type ExtendedNetwork } from "@/Models/Network"
import { useBalance } from "@/lib/balances/useBalance"
import { usePasskeyWalletState } from "@/lib/passkeyWallet/usePasskeyWalletState"
import { passkeyWalletWorker } from "@/lib/passkeyWallet/workerClient"
import {
    getPasskeyWalletPrf,
    setPasskeyWalletAccount,
} from "@/lib/passkeyWallet/state"
import { deletePasskeyWalletAccount } from "@/lib/passkeyWallet/storage"
import MobilePageHeader from "@/components/MobilePageHeader"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/shadcn/select"
import { useAuthDialog } from "@/stores/authDialogStore"

const WalletView: FC = () => {
    const sd = useOptionalSecretDerivation()
    const openAuthDialog = useAuthDialog((s) => s.openAuthDialog)
    const { address, credentialId } = usePasskeyWalletState()

    const { networks } = useSettingsState()
    const evmNetworks = useMemo(
        () =>
            networks.filter(
                (n) =>
                    n.networkType === NetworkTypes.EVM &&
                    !!getNativeToken(n) &&
                    !!n.chainId &&
                    !Number.isNaN(Number(n.chainId)),
            ),
        [networks],
    )

    if (!sd || !address) {
        return (
            <>
                <MobilePageHeader />
                <EmptyState
                    onLogin={() => { if (sd?.isReady) openAuthDialog() }}
                    disabled={!sd?.isReady}
                />
            </>
        )
    }

    return (
        <>
            <MobilePageHeader />
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
                <AddressCard
                    address={address}
                    onLogout={() => sd.logout()}
                    onForget={async () => {
                        if (!credentialId) return
                        try { await deletePasskeyWalletAccount(credentialId) }
                        finally {
                            void passkeyWalletWorker.clear()
                            setPasskeyWalletAccount(null, null)
                        }
                    }}
                />
                <NetworkPanel address={address} evmNetworks={evmNetworks} />
            </div>
        </>
    )
}

const EmptyState: FC<{ onLogin: () => void; disabled?: boolean }> = ({ onLogin, disabled }) => (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-secondary-400 text-primary-text">
            <WalletIcon className="size-6" strokeWidth={2} />
        </div>
        <div className="space-y-1">
            <h1 className="text-xl font-semibold">Train Wallet</h1>
            <p className="text-sm text-secondary-text">
                Log in with your passkey to view and manage your Train Wallet.
                Keys never leave your device — Train cannot recover lost passkeys.
            </p>
        </div>
        <Button onClick={onLogin} disabled={disabled}>
            Log in with passkey
        </Button>
    </div>
)

const AddressCard: FC<{
    address: Address
    onLogout: () => void
    onForget: () => void | Promise<void>
}> = ({ address, onLogout, onForget }) => {
    const [copied, setCopied] = useState(false)

    const copy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(address)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch { /* clipboard denied */ }
    }, [address])

    return (
        <div className="rounded-4xl border border-border bg-secondary-700 p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-secondary-text">
                        Train Wallet
                    </div>
                    <div className="mt-1 font-mono text-sm break-all sm:text-base">{address}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button size="icon-sm" variant="ghost" onClick={copy} aria-label="Copy address">
                        <Copy />
                    </Button>
                </div>
            </div>
            {copied && <div className="mt-2 text-xs text-secondary-text">Address copied.</div>}

            <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={onLogout}>
                    <LogOut />
                    Log out
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void onForget()} title="Remove the local wallet record. Your passkey stays on your device — you can recover the same wallet by logging in again.">
                    Forget on this device
                </Button>
            </div>
        </div>
    )
}

const NetworkPanel: FC<{
    address: Address
    evmNetworks: ExtendedNetwork[]
}> = ({ address, evmNetworks }) => {
    const getEffectiveRpcUrls = useRpcConfigStore((s) => s.getEffectiveRpcUrls)
    const [selectedCaip2, setSelectedCaip2] = useState<string | null>(evmNetworks[0]?.caip2Id ?? null)

    const selectedNetwork = useMemo(
        () => evmNetworks.find((n) => n.caip2Id === selectedCaip2) ?? evmNetworks[0],
        [evmNetworks, selectedCaip2],
    )

    if (!selectedNetwork) {
        return (
            <div className="rounded-4xl border border-border bg-secondary-700 p-5 text-sm text-secondary-text">
                No EVM networks available.
            </div>
        )
    }

    const rpcUrl = getEffectiveRpcUrls(selectedNetwork)[0] ?? ''
    const nativeSymbol = getNativeToken(selectedNetwork)?.symbol ?? 'ETH'

    if (!rpcUrl) {
        return (
            <div className="rounded-4xl border border-border bg-secondary-700 p-5 text-sm text-secondary-text">
                No RPC configured for {selectedNetwork.displayName}.
            </div>
        )
    }

    return (
        <div className="rounded-4xl border border-border bg-secondary-700 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold">Network</div>
                <Select value={selectedNetwork.caip2Id} onValueChange={setSelectedCaip2}>
                    <SelectTrigger size="sm" className="min-w-45">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {evmNetworks.map((n) => (
                            <SelectItem key={n.caip2Id} value={n.caip2Id}>
                                {n.displayName}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <BalanceRow address={address} network={selectedNetwork} />

            <div className="flex flex-wrap gap-2">
                {selectedNetwork.explorerUrlTemplate?.address && (
                    <Button asChild size="sm" variant="outline">
                        <a
                            href={selectedNetwork.explorerUrlTemplate.address.replace('{address}', address)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink />
                            View on explorer
                        </a>
                    </Button>
                )}
            </div>

            <SendForm
                fromAddress={address}
                network={selectedNetwork}
                rpcUrl={rpcUrl}
                symbol={nativeSymbol}
                explorerTxTemplate={selectedNetwork.explorerUrlTemplate?.transaction}
            />
        </div>
    )
}

const BalanceRow: FC<{
    address: Address
    network: ExtendedNetwork
}> = ({ address, network }) => {
    // useBalance routes through the existing BalanceResolver (chain-aware provider
    // selection, dedupe, retry, store caching). One source of truth for "what is
    // this address's balance on this network" across the app.
    const { balances, isLoading, error, mutate } = useBalance(address, network, { refreshInterval: 60_000 })

    // Order: native first, then by symbol. Fall back to the network's token list
    // before any balances have loaded so the user sees the assets present on this
    // network even while fetching.
    const rows = useMemo(() => {
        if (balances && balances.length > 0) {
            return [...balances].sort((a, b) => {
                if (a.isNativeCurrency !== b.isNativeCurrency) return a.isNativeCurrency ? -1 : 1
                return a.token.localeCompare(b.token)
            })
        }
        return network.tokens.map((t) => ({
            network: network.caip2Id,
            token: t.symbol,
            amount: undefined,
            decimals: t.decimals,
            isNativeCurrency: t.contract === network.nativeTokenAddress,
            request_time: '',
        }))
    }, [balances, network])

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-secondary-text">Balances</div>
                <Button size="icon-sm" variant="ghost" onClick={mutate} aria-label="Refresh balances" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                </Button>
            </div>
            {rows.length === 0 ? (
                <div className="text-sm text-secondary-text">No tokens configured.</div>
            ) : (
                <ul className="divide-y divide-border rounded-2xl border border-border bg-secondary-800">
                    {rows.map((b) => {
                        const token = network.tokens.find((t) => t.symbol === b.token)
                        const display = b.amount !== undefined
                            ? b.amount
                            : isLoading ? '—' : '?'
                        return (
                            <li key={`${b.token}-${b.isNativeCurrency}`} className="flex items-center justify-between gap-3 px-3 py-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {token?.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={token.logoUrl} alt="" className="size-6 shrink-0 rounded-full" />
                                    ) : (
                                        <div className="size-6 shrink-0 rounded-full bg-secondary-500" />
                                    )}
                                    <span className="truncate text-sm font-medium">{b.token}</span>
                                    {b.isNativeCurrency && (
                                        <span className="rounded-full bg-secondary-500 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-secondary-text">
                                            Native
                                        </span>
                                    )}
                                </div>
                                <div className="font-mono text-sm">{display}</div>
                            </li>
                        )
                    })}
                </ul>
            )}
            {error ? (
                <div className="text-xs text-destructive">
                    {error instanceof Error ? error.message : String(error)}
                </div>
            ) : null}
        </div>
    )
}

const SendForm: FC<{
    fromAddress: Address
    network: ExtendedNetwork
    rpcUrl: string
    symbol: string
    explorerTxTemplate?: string
}> = ({ fromAddress, network, rpcUrl, symbol, explorerTxTemplate }) => {
    const [to, setTo] = useState('')
    const [amount, setAmount] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [txHash, setTxHash] = useState<Hex | null>(null)

    const validation = useMemo(() => {
        const toValid = isAddress(to)
        let value: bigint | null = null
        try {
            if (amount.length > 0) {
                const parsed = parseEther(amount)
                if (parsed > 0n) value = parsed
            }
        } catch { /* invalid */ }
        return { toValid, amountValid: value !== null, value }
    }, [to, amount])

    const onSend = useCallback(async () => {
        if (!validation.toValid || !validation.value) return
        setSubmitting(true)
        setError(null)
        setTxHash(null)
        try {
            // Fresh passkey assertion → raw PRF → transferred to worker. Worker
            // derives the seed, verifies the address matches `fromAddress`,
            // builds the tx, signs, and broadcasts.
            const prf = await getPasskeyWalletPrf()
            const hash = await passkeyWalletWorker.sendTransaction(prf, fromAddress, {
                chainId: Number(network.chainId),
                rpcUrl,
                to: to as Address,
                value: validation.value,
            })
            setTxHash(hash)
            setAmount('')
            setTo('')
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setSubmitting(false)
        }
    }, [validation.toValid, validation.value, fromAddress, network.chainId, rpcUrl, to])

    return (
        <div className="space-y-3 border-t border-border pt-4">
            <div className="text-sm font-semibold">Send {symbol}</div>
            <div className="space-y-2">
                <Input
                    placeholder="Recipient 0x…"
                    value={to}
                    onChange={(e) => setTo(e.target.value.trim())}
                    aria-invalid={to.length > 0 && !validation.toValid}
                    className="h-10 font-mono text-sm"
                />
                <div className="flex gap-2">
                    <Input
                        placeholder={`Amount (${symbol})`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        inputMode="decimal"
                        aria-invalid={amount.length > 0 && !validation.amountValid}
                        className="h-10"
                    />
                    <Button
                        onClick={() => void onSend()}
                        disabled={!validation.toValid || !validation.amountValid || submitting}
                    >
                        {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                        Send
                    </Button>
                </div>
            </div>
            {error && <div className="text-xs text-destructive">{error}</div>}
            {txHash && (
                <div className="text-xs text-secondary-text break-all">
                    Sent:{' '}
                    {explorerTxTemplate ? (
                        <a
                            className="underline"
                            href={explorerTxTemplate.replace('{hash}', txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {txHash}
                        </a>
                    ) : (
                        <span className="font-mono">{txHash}</span>
                    )}
                </div>
            )}
        </div>
    )
}

export default WalletView
