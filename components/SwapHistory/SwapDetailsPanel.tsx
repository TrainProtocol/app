import { FC } from 'react'
import { ExternalLink } from 'lucide-react'
import { SwapData } from '@/stores/swapStore'
import { Network } from '@/Models/Network'
import { HTLCStatus } from '@/Models/HTLCStatus'
import { getExplorerUrl } from '@/lib/address'
import shortenString from '@/components/utils/ShortenString'
import NetworkSettings from '@/lib/NetworkSettings'
import CopyButton from '@/components/buttons/copyButton'

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
    </svg>
)

type Props = {
    swap: SwapData
    sourceNetwork?: Network
    destNetwork?: Network
}

const SwapDetailsPanel: FC<Props> = ({ swap, sourceNetwork, destNetwork }) => {
    const srcExplorerTemplate = sourceNetwork
        ? NetworkSettings.KnownSettings[sourceNetwork.caip2Id]?.TransactionExplorerTemplate
        : undefined

    const destExplorerTemplate = destNetwork
        ? NetworkSettings.KnownSettings[destNetwork.caip2Id]?.TransactionExplorerTemplate
        : undefined

    const isRefunded = swap.status === HTLCStatus.Refunded

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

                {/* Status */}
                <div className="flex justify-between items-center">
                    <p className="text-secondary-text">Status</p>
                    {swap.status === HTLCStatus.RedeemCompleted ? (
                        <span className="inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-success-background text-success-foreground">
                            <CheckIcon />
                            Completed
                        </span>
                    ) : swap.status === HTLCStatus.Refunded ? (
                        <span className="inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-success-background text-success-foreground">
                            <CheckIcon />
                            Refund Completed
                        </span>
                    ) : (
                        <span className="text-primary-text-tertiary">—</span>
                    )}
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
        </div>
    )
}

export default SwapDetailsPanel
