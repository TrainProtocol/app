import { FC } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { type SwapData, HTLCStatus, isTerminalStatus } from '@train-protocol/react'
import { Network } from '@/Models/Network'
import { getExplorerUrl } from '@/lib/address'
import shortenString from '@/components/utils/ShortenString'
import CopyButton from '@/components/buttons/copyButton'
import StatusIcons from './StatusIcons'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildHrefWithPersistantParams } from '@/helpers/querryHelper'
import { getDateDifferenceString } from '@/components/utils/dateDifference'
import { useSwapStore } from '@/stores/swapStore'
import { captureEvent } from '@/lib/faro'

type Props = {
    swap: SwapData
    sourceNetwork?: Network
    destNetwork?: Network
}

const SwapDetailsPanel: FC<Props> = ({ swap, sourceNetwork, destNetwork }) => {
    const router = useRouter()
    const searchParams = useSearchParams()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)

    const srcExplorerTemplate = sourceNetwork?.explorerUrlTemplate?.transaction
    const destExplorerTemplate = destNetwork?.explorerUrlTemplate?.transaction

    const isRefunded = swap.status === HTLCStatus.Refunded
    const isCompleted = swap.status === HTLCStatus.RedeemCompleted
    const isInProgress = swap.status && !isTerminalStatus(swap.status)

    const dateDifferenceString = swap.createdAt ? getDateDifferenceString(swap.createdAt) : undefined

    const handleViewSwap = () => {
        if (!swap.hashlock) return
        captureEvent("history_view_swap_clicked", { hashlock: swap.hashlock, status: swap.status })
        setActiveHashlock(swap.hashlock)
        setSwapModalOpen(true)
    }

    const handleRepeatSwap = () => {
        captureEvent("history_repeat_swap_clicked", {
            source_network: swap.source,
            destination_network: swap.destination,
        })
        router.push(buildHrefWithPersistantParams('/', searchParams, {
            from: swap.source,
            to: swap.destination,
            fromAsset: swap.source_asset,
            toAsset: swap.destination_asset,
            destAddress: swap.address,
        }))
    }

    return (
        <div className="space-y-3">
            <div className="py-3 px-4 bg-secondary-500 rounded-xl text-sm flex flex-col gap-3">
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

            <div className="py-3 px-4 bg-secondary-500 rounded-xl text-sm flex flex-col gap-3">
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

            {isInProgress && (
                <button
                    type="button"
                    onClick={handleViewSwap}
                    className="w-full py-3 px-4 rounded-xl bg-actionButtonColor text-primary-buttonTextColor font-semibold text-sm hover:bg-actionButtonColor/80 transition-colors"
                >
                    View Swap
                </button>
            )}

            {isCompleted && (
                <button
                    type="button"
                    onClick={handleRepeatSwap}
                    className="w-full py-3 px-4 rounded-xl bg-secondary-300 text-primary-text font-semibold text-sm hover:bg-secondary-200 transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Repeat Swap
                </button>
            )}
        </div>
    )
}

export default SwapDetailsPanel
