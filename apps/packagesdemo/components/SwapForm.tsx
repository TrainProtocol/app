import { useState, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import {
    useNetwork,
    useTokens,
    useQuote,
    useSwap,
    useSwapState,
    useSwapActions,
    useSecretDerivation,
    HTLCStatus,
    type Network,
    type Token,
    type StartSwapParams,
} from '@train-protocol/react'
import { NetworkSelect } from './NetworkSelect'
import { TokenSelect } from './TokenSelect'

export function SwapForm() {
    const { address, isConnected } = useAccount()
    const { connect } = useConnect()
    const { disconnect } = useDisconnect()

    // Swap form state
    const [sourceNetworkId, setSourceNetworkId] = useState('')
    const [destNetworkId, setDestNetworkId] = useState('')
    const [sourceToken, setSourceToken] = useState('')
    const [destToken, setDestToken] = useState('')
    const [amount, setAmount] = useState('')
    const [destAddress, setDestAddress] = useState('')

    // Package hooks
    const sourceNetwork = useNetwork(sourceNetworkId)
    const destNetwork = useNetwork(destNetworkId)
    const sourceTokens = useTokens(sourceNetworkId)
    const destTokens = useTokens(destNetworkId)


    const sourceAsset = sourceTokens.find((t: Token) => t.symbol === sourceToken)
    const destAsset = destTokens.find((t: Token) => t.symbol === destToken)

    // Quote
    const { bestQuote, bestSolver, isLoading: quoteLoading } = useQuote({
        amount,
        sourceNetwork: sourceNetworkId,
        destinationNetwork: destNetworkId,
        sourceTokenContract: sourceToken || undefined,
        destinationTokenContract: destToken || undefined,
        enabled: !!amount && !!sourceNetworkId && !!destNetworkId && Number(amount) > 0,
    })

    // Swap lifecycle
    const { status, error: swapError, startSwap, revealSecret, refund, reset } = useSwap()
    const swapState = useSwapState()
    const { setCurrentSwap } = useSwapActions()

    // Secret derivation (with persistence across page refresh)
    const {
        isLoggedIn,
        derivationStatus,
        derivationMessage,
        loginWithWallet,
        loginWithPasskey,
        registerPasskey,
        prfSupport,
        checkPasskeySupport,
        logout: authLogout,
    } = useSecretDerivation({ persist: true })

    // Check passkey support on mount
    useState(() => { checkPasskeySupport() })

    // Login with connected wallet — adapter provides the config
    const handleWalletLogin = useCallback(async () => {
        await loginWithWallet('eip155')
    }, [loginWithWallet])

    // Login with passkey
    const handlePasskeyLogin = useCallback(async () => {
        await loginWithPasskey()
    }, [loginWithPasskey])

    // Register new passkey
    const handlePasskeyRegister = useCallback(async () => {
        await registerPasskey('Train Demo')
    }, [registerPasskey])

    // Start swap
    const handleSwap = useCallback(async () => {
        if (!isLoggedIn || !bestQuote || !bestSolver || !sourceAsset || !sourceNetwork || !destNetwork || !address) return

        const srcContract = sourceNetwork.contracts?.find(c => c.type === 'Train')?.address
        const dstContract = destNetwork.contracts?.find(c => c.type === 'Train')?.address


        if (!srcContract || !dstContract) {
            alert('No HTLC contract found for selected networks')
            return
        }

        // Set current swap in store before starting
        setCurrentSwap({
            requestedAmount: amount,
            address,
            source: sourceNetworkId,
            destination: destNetworkId,
            source_asset: sourceToken,
            destination_asset: destToken,
            solver: bestSolver.solver.id,
            srcContract,
            destContract: dstContract,
            receiveAmount: bestQuote.receiveAmount,
        })

        const params: StartSwapParams = {
            amount,
            sourceNetwork: sourceNetworkId,
            destinationNetwork: destNetworkId,
            sourceAsset,
            destinationAsset: destToken,
            sourceAddress: address,
            destinationAddress: destAddress || address,
            solverId: bestSolver.solver.id,
            quote: bestQuote,
            srcContract,
            destContract: dstContract,
            tokenContractAddress: sourceToken,
            chainId: sourceNetwork.chainId,
        }

        try {
            await startSwap(params)
        } catch (err) {
            console.error('Swap failed:', err)
        }
    }, [
        isLoggedIn, bestQuote, bestSolver, sourceAsset, sourceNetwork, destNetwork,
        address, amount, sourceNetworkId, destNetworkId, sourceToken, destToken,
        destAddress, setCurrentSwap, startSwap,
    ])

    const statusLabel = getStatusLabel(status)
    const isSwapping = status !== HTLCStatus.Initial && status !== HTLCStatus.RedeemCompleted && status !== HTLCStatus.Refunded

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
                            onChange={(id) => { setSourceNetworkId(id); setSourceToken('') }}
                            exclude={destNetworkId}
                        />
                        <TokenSelect
                            networkId={sourceNetworkId}
                            value={sourceToken}
                            onChange={setSourceToken}
                        />

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <span style={{ fontSize: 20, color: '#71717a' }}>↓</span>
                        </div>

                        <NetworkSelect
                            label="Destination Network"
                            value={destNetworkId}
                            onChange={(id) => { setDestNetworkId(id); setDestToken('') }}
                            exclude={sourceNetworkId}
                        />
                        <TokenSelect
                            networkId={destNetworkId}
                            value={destToken}
                            onChange={setDestToken}
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

                        {/* Quote */}
                        {bestQuote && (
                            <div style={{ background: '#1c1c21', borderRadius: 8, padding: 12 }}>
                                <div className="row">
                                    <span className="label">You receive</span>
                                    <span>{bestQuote.receiveAmount} {destAsset?.symbol}</span>
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
                            disabled={!isConnected || !isLoggedIn || !bestQuote || !amount}
                            style={{
                                background: '#6366f1',
                                color: 'white',
                                padding: '12px',
                                fontSize: 16,
                                width: '100%',
                            }}
                        >
                            {!isConnected
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
                        {swapState.hashlock && (
                            <div className="row">
                                <span className="label">Hashlock</span>
                                <code style={{ fontSize: 11, wordBreak: 'break-all' }}>
                                    {swapState.hashlock.slice(0, 10)}...{swapState.hashlock.slice(-8)}
                                </code>
                            </div>
                        )}
                        {swapState.sourceDetails && (
                            <div className="row">
                                <span className="label">Source Lock</span>
                                <span className="status-badge success">Confirmed</span>
                            </div>
                        )}
                        {swapState.solverLockDetails && (
                            <div className="row">
                                <span className="label">Solver Lock</span>
                                <span className="status-badge success">Detected</span>
                            </div>
                        )}
                        {swapState.secretRevealed && (
                            <div className="row">
                                <span className="label">Secret</span>
                                <span className="status-badge success">Revealed</span>
                            </div>
                        )}

                        {/* Auto-reveal secret when solver lock detected */}
                        {status === HTLCStatus.SolverLockDetected && !swapState.secretRevealed && (
                            <button
                                onClick={() => revealSecret()}
                                style={{ background: '#6366f1', color: 'white', width: '100%' }}
                            >
                                Reveal Secret
                            </button>
                        )}

                        {swapState.isTimelockExpired && (
                            <button
                                onClick={() => refund()}
                                style={{ background: '#dc2626', color: 'white', width: '100%' }}
                            >
                                Refund
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
                {(status === HTLCStatus.RedeemCompleted || status === HTLCStatus.Refunded) && (
                    <div className="card stack">
                        <div className="row">
                            <span className="label">Result</span>
                            <span className={`status-badge ${status === HTLCStatus.RedeemCompleted ? 'success' : 'error'}`}>
                                {status === HTLCStatus.RedeemCompleted ? 'Swap Complete' : 'Refunded'}
                            </span>
                        </div>
                        <button
                            onClick={reset}
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
