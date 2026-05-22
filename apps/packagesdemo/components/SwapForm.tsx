import { useState, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { parseUnits, formatUnits } from 'viem'
import {
    useNetwork,
    useTokens,
    useQuote,
    useCreateSwap,
    useSwapProgress,
    useRevealSecret,
    useRefund,
    useSharedSecretDerivation,
    HTLCStatus,
    type Token,
    type StartSwapParams,
} from '@train-protocol/react'
import { NetworkSelect } from './NetworkSelect'
import { TokenSelect } from './TokenSelect'

export function SwapForm() {
    const { address, isConnected } = useAccount()
    const { connect } = useConnect()
    const { disconnect } = useDisconnect()

    // Form state — token state holds the token *contract* (see TokenSelect)
    const [sourceNetworkId, setSourceNetworkId] = useState('')
    const [destNetworkId, setDestNetworkId] = useState('')
    const [sourceTokenContract, setSourceTokenContract] = useState('')
    const [destTokenContract, setDestTokenContract] = useState('')
    const [amount, setAmount] = useState('')
    const [destAddress, setDestAddress] = useState('')

    // Active swap (drives the lifecycle UI). Set by createSwap on success.
    const [activeHashlock, setActiveHashlock] = useState<string | null>(null)

    const sourceNetwork = useNetwork(sourceNetworkId)
    const destNetwork = useNetwork(destNetworkId)
    const sourceTokens = useTokens(sourceNetworkId)
    const destTokens = useTokens(destNetworkId)

    const sourceAsset = sourceTokens.find((t: Token) => t.contract === sourceTokenContract)
    const destAsset = destTokens.find((t: Token) => t.contract === destTokenContract)

    // Quote API expects base units; userLock parses internally so it keeps the human-readable string.
    let quoteAmount: string | undefined
    if (amount && sourceAsset && Number(amount) > 0) {
        try {
            quoteAmount = parseUnits(amount, sourceAsset.decimals).toString()
        } catch {
            quoteAmount = undefined
        }
    }

    const { bestQuote, bestSolver, isLoading: quoteLoading } = useQuote({
        amount: quoteAmount,
        sourceNetwork: sourceNetworkId,
        destinationNetwork: destNetworkId,
        sourceTokenContract: sourceTokenContract || undefined,
        destinationTokenContract: destTokenContract || undefined,
        enabled: !!quoteAmount && !!sourceNetworkId && !!destNetworkId,
    })

    // Lifecycle hooks
    const { createSwap, isCreating, error: createError } = useCreateSwap()
    const { reveal, isRevealing, error: revealError } = useRevealSecret()
    const { refund, isRefunding, error: refundError } = useRefund()
    const progress = useSwapProgress(activeHashlock)

    // Secret derivation (passkey + wallet-sign) — shared with TrainProvider's internal store.
    // Persistence + auto passkey-check are configured via TrainProvider's secretDerivation prop.
    const {
        isLoggedIn,
        derivationStatus,
        derivationMessage,
        loginWithWallet,
        loginWithPasskey,
        registerPasskey,
        prfSupport,
        logout: authLogout,
    } = useSharedSecretDerivation()

    const handleWalletLogin = useCallback(async () => {
        await loginWithWallet('eip155')
    }, [loginWithWallet])

    const handlePasskeyLogin = useCallback(async () => {
        await loginWithPasskey()
    }, [loginWithPasskey])

    const handlePasskeyRegister = useCallback(async () => {
        await registerPasskey('Train Demo')
    }, [registerPasskey])

    const handleSwap = useCallback(async () => {
        if (!isLoggedIn || !bestQuote || !sourceAsset || !destAsset || !sourceNetwork || !destNetwork || !address) return

        const srcContract = sourceNetwork.trainContract
        const dstContract = destNetwork.trainContract
        if (!srcContract || !dstContract) {
            alert('No HTLC contract found for selected networks')
            return
        }

        const params: StartSwapParams = {
            amount,
            sourceNetwork: sourceNetworkId,
            destinationNetwork: destNetworkId,
            sourceAsset,
            destinationAsset: destAsset,
            sourceAddress: address,
            destinationAddress: destAddress || address,
            quote: bestQuote,
            srcContract,
            destContract: dstContract,
            chainId: sourceNetwork.chainId,
        }

        try {
            const hashlock = await createSwap(params)
            setActiveHashlock(hashlock)
        } catch (err) {
            console.error('Swap failed:', err)
        }
    }, [
        isLoggedIn, bestQuote, sourceAsset, destAsset, sourceNetwork, destNetwork,
        address, amount, sourceNetworkId, destNetworkId, destAddress, createSwap,
    ])

    const handleReveal = useCallback(() => {
        if (activeHashlock) reveal(activeHashlock)
    }, [activeHashlock, reveal])

    const handleRefund = useCallback(() => {
        if (activeHashlock) refund({ hashlock: activeHashlock, address })
    }, [activeHashlock, refund, address])

    const handleReset = useCallback(() => {
        setActiveHashlock(null)
    }, [])

    const status = progress.status
    const isSwapping = !!activeHashlock
        && status !== HTLCStatus.RedeemCompleted
        && status !== HTLCStatus.Refunded

    const statusLabel = getStatusLabel(status)
    const swapError = progress.error ?? createError ?? revealError ?? refundError

    return (
        <div className="container">
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
                Train Protocol Demo
            </h1>
            <p style={{ fontSize: 14, color: '#71717a', marginBottom: 24 }}>
                Minimal cross-chain swap using @train-protocol/react
            </p>

            <div className="stack" style={{ gap: 16 }}>
                {/* Wallet Connection */}
                <div className="card">
                    <div className="row">
                        <span className="label">Wallet</span>
                        {isConnected ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <code style={{ fontSize: 12 }}>
                                    {address?.slice(0, 6)}...{address?.slice(-4)}
                                </code>
                                <button
                                    onClick={() => disconnect()}
                                    style={{ background: '#27272a', color: '#e4e4e7', padding: '6px 12px', fontSize: 12 }}
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => connect({ connector: injected() })}
                                style={{ background: '#6366f1', color: 'white', padding: '6px 12px', fontSize: 12 }}
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>
                    {isConnected && (
                        <div className="row">
                            <span className="label">Secret Key</span>
                            {isLoggedIn ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span className="status-badge success">Derived</span>
                                    <button
                                        onClick={authLogout}
                                        style={{ background: '#27272a', color: '#e4e4e7', padding: '6px 12px', fontSize: 12 }}
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        onClick={handleWalletLogin}
                                        disabled={derivationStatus === 'signing'}
                                        style={{ background: '#6366f1', color: 'white', padding: '6px 12px', fontSize: 12 }}
                                    >
                                        {derivationStatus === 'signing' ? derivationMessage : 'Sign with Wallet'}
                                    </button>
                                    {prfSupport?.supported && (
                                        <button
                                            onClick={handlePasskeyLogin}
                                            disabled={derivationStatus === 'signing'}
                                            style={{ background: '#4f46e5', color: 'white', padding: '6px 12px', fontSize: 12 }}
                                        >
                                            Use Passkey
                                        </button>
                                    )}
                                    {prfSupport?.supported && (
                                        <button
                                            onClick={handlePasskeyRegister}
                                            disabled={derivationStatus === 'signing'}
                                            style={{ background: '#4338ca', color: 'white', padding: '6px 12px', fontSize: 12 }}
                                        >
                                            Register Passkey
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Swap Form */}
                {!isSwapping && (
                    <div className="card stack">
                        <NetworkSelect
                            label="Source Network"
                            value={sourceNetworkId}
                            onChange={(id) => { setSourceNetworkId(id); setSourceTokenContract('') }}
                            exclude={destNetworkId}
                        />
                        <TokenSelect
                            networkId={sourceNetworkId}
                            value={sourceTokenContract}
                            onChange={setSourceTokenContract}
                        />

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <span style={{ fontSize: 20, color: '#71717a' }}>↓</span>
                        </div>

                        <NetworkSelect
                            label="Destination Network"
                            value={destNetworkId}
                            onChange={(id) => { setDestNetworkId(id); setDestTokenContract('') }}
                            exclude={sourceNetworkId}
                        />
                        <TokenSelect
                            networkId={destNetworkId}
                            value={destTokenContract}
                            onChange={setDestTokenContract}
                        />

                        <div className="stack" style={{ gap: 4 }}>
                            <label style={{ fontSize: 12, color: '#71717a' }}>Amount</label>
                            <input
                                type="text"
                                placeholder="0.0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="stack" style={{ gap: 4 }}>
                            <label style={{ fontSize: 12, color: '#71717a' }}>
                                Destination Address (defaults to connected wallet)
                            </label>
                            <input
                                type="text"
                                placeholder={address ?? '0x...'}
                                value={destAddress}
                                onChange={e => setDestAddress(e.target.value)}
                            />
                        </div>

                        {bestQuote && (
                            <div style={{ background: '#1c1c21', borderRadius: 8, padding: 12 }}>
                                <div className="row">
                                    <span className="label">You receive</span>
                                    <span>
                                        {destAsset ? formatUnits(BigInt(bestQuote.receiveAmount), destAsset.decimals) : bestQuote.receiveAmount}
                                        {' '}{destAsset?.symbol}
                                    </span>
                                </div>
                                <div className="row">
                                    <span className="label">Solver</span>
                                    <span>{bestSolver?.solver.id}</span>
                                </div>
                            </div>
                        )}
                        {quoteLoading && (
                            <p style={{ fontSize: 12, color: '#71717a', textAlign: 'center' }}>
                                Fetching quotes...
                            </p>
                        )}

                        <button
                            onClick={handleSwap}
                            disabled={!isConnected || !isLoggedIn || !bestQuote || !amount || isCreating}
                            style={{
                                background: '#6366f1',
                                color: 'white',
                                padding: '12px',
                                fontSize: 16,
                                width: '100%',
                            }}
                        >
                            {isCreating
                                ? 'Locking funds...'
                                : !isConnected
                                    ? 'Connect Wallet First'
                                    : !isLoggedIn
                                        ? 'Derive Key First'
                                        : !bestQuote
                                            ? 'Enter Swap Details'
                                            : 'Swap'}
                        </button>
                    </div>
                )}

                {/* Swap Progress */}
                {isSwapping && (
                    <div className="card stack">
                        <div className="row">
                            <span className="label">Status</span>
                            <span className={`status-badge ${statusLabel.type}`}>
                                {statusLabel.text}
                            </span>
                        </div>
                        {progress.hashlock && (
                            <div className="row">
                                <span className="label">Hashlock</span>
                                <code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                                    {progress.hashlock.slice(0, 10)}...{progress.hashlock.slice(-8)}
                                </code>
                            </div>
                        )}
                        {progress.sourceDetails && (
                            <div className="row">
                                <span className="label">Source Lock</span>
                                <span className="status-badge success">Confirmed</span>
                            </div>
                        )}
                        {progress.solverLockDetails && (
                            <div className="row">
                                <span className="label">Solver Lock</span>
                                <span className="status-badge success">Detected</span>
                            </div>
                        )}
                        {progress.secretRevealed && (
                            <div className="row">
                                <span className="label">Secret</span>
                                <span className="status-badge success">Revealed</span>
                            </div>
                        )}

                        {status === HTLCStatus.SolverLockDetected && !progress.secretRevealed && (
                            <button
                                onClick={handleReveal}
                                disabled={isRevealing}
                                style={{ background: '#6366f1', color: 'white', width: '100%' }}
                            >
                                {isRevealing ? 'Revealing...' : 'Reveal Secret'}
                            </button>
                        )}

                        {progress.isTimelockExpired && (
                            <button
                                onClick={handleRefund}
                                disabled={isRefunding}
                                style={{ background: '#dc2626', color: 'white', width: '100%' }}
                            >
                                {isRefunding ? 'Refunding...' : 'Refund'}
                            </button>
                        )}

                        {swapError && (
                            <p style={{ color: '#f87171', fontSize: 12 }}>
                                Error: {swapError.message}
                            </p>
                        )}
                    </div>
                )}

                {/* Reset after completion */}
                {activeHashlock && (status === HTLCStatus.RedeemCompleted || status === HTLCStatus.Refunded) && (
                    <div className="card stack">
                        <div className="row">
                            <span className="label">Result</span>
                            <span className={`status-badge ${status === HTLCStatus.RedeemCompleted ? 'success' : 'error'}`}>
                                {status === HTLCStatus.RedeemCompleted ? 'Swap Complete' : 'Refunded'}
                            </span>
                        </div>
                        <button
                            onClick={handleReset}
                            style={{ background: '#27272a', color: '#e4e4e7', width: '100%' }}
                        >
                            New Swap
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

function getStatusLabel(status: HTLCStatus): { text: string; type: string } {
    switch (status) {
        case HTLCStatus.Initial:
            return { text: 'Ready', type: 'pending' }
        case HTLCStatus.UserLocked:
            return { text: 'User Locked — Waiting for Solver', type: 'pending' }
        case HTLCStatus.SolverLockDetected:
            return { text: 'Solver Locked — Reveal Secret', type: 'pending' }
        case HTLCStatus.SecretRevealed:
            return { text: 'Secret Revealed — Waiting for Redeem', type: 'pending' }
        case HTLCStatus.ManualClaimRequired:
            return { text: 'Manual Claim Required', type: 'error' }
        case HTLCStatus.RedeemCompleted:
            return { text: 'Complete', type: 'success' }
        case HTLCStatus.TimelockExpired:
            return { text: 'Timelock Expired', type: 'error' }
        case HTLCStatus.Refunded:
            return { text: 'Refunded', type: 'error' }
        default:
            return { text: String(status), type: 'pending' }
    }
}
