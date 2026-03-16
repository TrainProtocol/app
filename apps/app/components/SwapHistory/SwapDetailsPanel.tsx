import { FC } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'
import { LoginIdentity, SwapData, useSwapStore } from '@/stores/swapStore'
import { Network } from '@/Models/Network'
import { HTLCStatus, isTerminalStatus } from '@/Models/HTLCStatus'
import { getExplorerUrl } from '@/lib/address'
import shortenString from '@/components/utils/ShortenString'
import NetworkSettings from '@/lib/NetworkSettings'
import CopyButton from '@/components/buttons/copyButton'
import StatusIcons from './StatusIcons'
import { useRouter } from 'next/router'
import { resolvePersistantQueryParams } from '@/helpers/querryHelper'
import { getDateDifferenceString } from '@/components/utils/dateDifference'
import { useLoginIdentityMismatch } from '@/hooks/useLoginIdentityMismatch'
import { formatPasskeyIdForDisplay } from '@/lib/htlc/secretDerivation/passkeyService'

type Props = {
    swap: SwapData
    sourceNetwork?: Network
    destNetwork?: Network
}

const SwapDetailsPanel: FC<Props> = ({ swap, sourceNetwork, destNetwork }) => {
    const router = useRouter()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)

    const srcExplorerTemplate = sourceNetwork
        ? NetworkSettings.KnownSettings[sourceNetwork.caip2Id]?.TransactionExplorerTemplate
        : undefined

    const destExplorerTemplate = destNetwork
        ? NetworkSettings.KnownSettings[destNetwork.caip2Id]?.TransactionExplorerTemplate
        : undefined

    const isRefunded = swap.status === HTLCStatus.Refunded
    const isCompleted = swap.status === HTLCStatus.RedeemCompleted
    const isInProgress = swap.status && !isTerminalStatus(swap.status)
    const { isMismatched } = useLoginIdentityMismatch(swap.loginIdentity)

    const dateDifferenceString = swap.createdAt ? getDateDifferenceString(swap.createdAt) : undefined

    const handleViewSwap = () => {
        if (swap.hashlock) {
            setActiveHashlock(swap.hashlock)
            setSwapModalOpen(true)
        }
    }

    const handleRepeatSwap = () => {
        router.push({
            pathname: '/',
            query: {
                from: swap.source,
                to: swap.destination,
                fromAsset: swap.source_asset,
                toAsset: swap.destination_asset,
                destAddress: swap.address,
                ...resolvePersistantQueryParams(router.query),
            },
        })
    }

    return (
        <div className="space-y-3">
            <div className="py-3 px-4 bg-secondary-700 rounded-xl text-sm flex flex-col gap-3">
                {/* Hashlock */}
                <div className="flex justify-between items-center">
                    <p className="text-secondary-text">Hashlock</p>
                    {swap.hashlock ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-primary-text font-mono text-xs">{shortenString(swap.hashlock)}</span>
                            <CopyButton
                                toCopy={swap.hashlock}
                                iconSize={13}
                                iconClassName="text-secondary-text hover:text-primary-text transition-colors"
                            />
                        </div>
                    ) : (
                        <span className="text-primary-text-tertiary">—</span>
                    )}
                </div>

                {/* Date & Time */}
                {swap.createdAt && (
                    <div className="flex justify-between items-baseline gap-2">
                        <p className="text-secondary-text shrink-0">Date & Time</p>
                        <span className="text-primary-text text-right text-xs">
                            {new Date(swap.createdAt).toLocaleString()}
                            {dateDifferenceString && (
                                <span className="text-primary-text-tertiary ml-1">
                                    {dateDifferenceString}
                                </span>
                            )}
                        </span>
                    </div>
                )}

                {/* Status */}
                <div className="flex justify-between items-center">
                    <p className="text-secondary-text">Status</p>
                    <StatusIcons status={swap.status} />
                </div>
            </div>

            <div className="py-3 px-4 bg-secondary-700 rounded-xl text-sm flex flex-col gap-3">
                {/* Source transaction */}
                <div className="flex justify-between items-baseline gap-2">
                    <p className="text-secondary-text shrink-0">Source transaction</p>
                    {swap.txId ? (
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={getExplorerUrl(srcExplorerTemplate, swap.txId)}
                            className="flex items-center gap-1 text-primary-text hover:underline"
                        >
                            <span className="font-mono text-xs">{shortenString(swap.txId)}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                    ) : (
                        <span className="text-primary-text-tertiary">—</span>
                    )}
                </div>

                {/* Refund or destination transaction */}
                <div className="flex justify-between items-baseline gap-2">
                    <p className="text-secondary-text shrink-0">
                        {isRefunded ? 'Refund transaction' : 'Destination transaction'}
                    </p>
                    {isRefunded && swap.refundTxId ? (
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={getExplorerUrl(srcExplorerTemplate, swap.refundTxId)}
                            className="flex items-center gap-1 text-primary-text hover:underline"
                        >
                            <span className="font-mono text-xs">{shortenString(swap.refundTxId)}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                    ) : !isRefunded && swap.destTxId ? (
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href={getExplorerUrl(destExplorerTemplate, swap.destTxId)}
                            className="flex items-center gap-1 text-primary-text hover:underline"
                        >
                            <span className="font-mono text-xs">{shortenString(swap.destTxId)}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </a>
                    ) : (
                        <span className="text-primary-text-tertiary">—</span>
                    )}
                </div>
            </div>

            {isInProgress && !isMismatched && (
                <button
                    type="button"
                    onClick={handleViewSwap}
                    className="w-full py-3 px-4 rounded-xl bg-primary-500 text-primary-buttonTextColor font-semibold text-sm hover:bg-primary-500/80 transition-colors"
                >
                    View Swap
                </button>
            )}

            {isInProgress && isMismatched && (
                <LoginMismatchWarning loginIdentity={swap.loginIdentity} />
            )}

            {isCompleted && (
                <button
                    type="button"
                    onClick={handleRepeatSwap}
                    className="w-full py-3 px-4 rounded-xl bg-secondary-700 text-primary-text font-semibold text-sm hover:bg-secondary-600 transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Repeat Swap
                </button>
            )}
        </div>
    )
}

const LoginMismatchWarning: FC<{ loginIdentity: LoginIdentity | undefined }> = ({ loginIdentity }) => {
    const createdWith = loginIdentity?.method === 'passkey'
        ? `passkey ${formatPasskeyIdForDisplay(loginIdentity.credentialId)}`
        : loginIdentity?.method === 'wallet_sign'
            ? `${loginIdentity.displayName} (${loginIdentity.address.slice(0, 6)}...${loginIdentity.address.slice(-4)})`
            : 'a different login method'

    return (
        <div className="py-3 px-4 bg-warning-background border border-warning-foreground/20 rounded-xl text-sm space-y-2">
            <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-warning-foreground shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-warning-foreground font-medium">Login method mismatch</p>
                    <p className="text-secondary-text">
                        This swap was created with {createdWith}. Please log in with the same method to continue this swap.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SwapDetailsPanel
