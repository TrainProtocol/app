import { ChevronRight } from 'lucide-react'
import { FC } from 'react'
import { ImageWithFallback } from '@/components/Common/ImageWithFallback'
import { type SwapData, isTerminalStatus, HTLCStatus } from '@train-protocol/react'
import { Network } from '@/Models/Network'
import StatusIcons from './StatusIcons'

type Props = {
    swap: SwapData
    sourceNetwork?: Network
    destNetwork?: Network
}

const HistorySummaryCard: FC<Props> = ({ swap, sourceNetwork, destNetwork }) => {
    const sourceToken = sourceNetwork?.tokens.find(t => t.symbol === swap.source_asset)
    const destToken = destNetwork?.tokens.find(t => t.symbol === swap.destination_asset)

    return (
        <>
            <div className="bg-secondary-500 relative z-10 w-full rounded-xl overflow-hidden hover:bg-secondary-400 transition-colors">
                <div className="grid grid-cols-12 items-center gap-2 relative z-50">
                    {/* Source */}
                    <div className="col-span-6 flex items-center gap-2 p-3">
                        <div className="w-8 h-8 relative shrink-0">
                            <div className="h-[30px] w-[30px] rounded-full overflow-hidden">
                                {sourceToken?.logo ? (
                                    <ImageWithFallback
                                        src={sourceToken.logo}
                                        alt={sourceToken.symbol}
                                        width={30}
                                        height={30}
                                        className="rounded-full"
                                    />
                                ) : (
                                    <div className="h-[30px] w-[30px] rounded-full bg-secondary-400" />
                                )}
                            </div>
                            {sourceNetwork?.logoUrl && (
                                <div className="absolute -bottom-0.5 -right-1 h-[18px] w-[18px] rounded-md overflow-hidden border border-secondary-500">
                                    <ImageWithFallback
                                        src={sourceNetwork.logoUrl}
                                        alt={sourceNetwork.displayName}
                                        width={18}
                                        height={18}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex min-w-0 flex-col items-start space-y-0.5 overflow-hidden">
                            <div className="text-primary-text text-sm sm:text-lg leading-5 flex items-center min-w-0 gap-1 w-full">
                                <span className="truncate block shrink">{swap.requestedAmount}</span>
                                <span className="shrink-0">{swap.source_asset}</span>
                            </div>
                            <span className="text-secondary-text text-sm text-left leading-3.5">
                                {sourceNetwork?.displayName ?? swap.source}
                            </span>
                        </div>
                    </div>

                    {/* Center arrow */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-10">
                        <div className="h-7 w-6 rounded-md bg-secondary-400 flex items-center justify-center">
                            <ChevronRight className="h-5 w-5 text-primary-text" />
                        </div>
                    </div>

                    {/* Destination */}
                    <div className="col-span-6 flex items-center justify-end gap-2 bg-secondary-400 p-3 rounded-xl">
                        <div className="flex min-w-0 flex-col items-end space-y-0.5 overflow-hidden">
                            <div className="text-primary-text text-sm sm:text-lg leading-5 flex items-center min-w-0 gap-1 w-full justify-end">
                                <span className="truncate block shrink">{swap.receiveAmount ?? '—'}</span>
                                <span className="shrink-0">{swap.destination_asset}</span>
                            </div>
                            <span className="text-secondary-text text-sm text-right leading-3.5">
                                {destNetwork?.displayName ?? swap.destination}
                            </span>
                        </div>
                        <div className="relative w-8 h-8 shrink-0">
                            <div className="h-[30px] w-[30px] rounded-full overflow-hidden">
                                {destToken?.logo ? (
                                    <ImageWithFallback
                                        src={destToken.logo}
                                        alt={destToken.symbol}
                                        width={30}
                                        height={30}
                                        className="rounded-full"
                                    />
                                ) : (
                                    <div className="h-[30px] w-[30px] rounded-full bg-secondary-500" />
                                )}
                            </div>
                            {destNetwork?.logoUrl && (
                                <div className="absolute -bottom-0.5 -right-1 h-[18px] w-[18px] rounded-md overflow-hidden border border-secondary-500">
                                    <ImageWithFallback
                                        src={destNetwork.logoUrl}
                                        alt={destNetwork.displayName}
                                        width={18}
                                        height={18}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {swap.status && !isTerminalStatus(swap.status) && swap.status !== HTLCStatus.Initial && (
                <div className="-mt-2 z-0 relative">
                    <div className={`pt-3.5 pb-1.5 w-full flex justify-center rounded-b-2xl ${
                        swap.status === HTLCStatus.UserLocked || swap.status === HTLCStatus.SolverLockDetected || swap.status === HTLCStatus.SecretRevealed
                            ? 'bg-primary-900'
                            : 'bg-warning-background'
                    }`}>
                        <StatusIcons status={swap.status} />
                    </div>
                </div>
            )}
        </>
    )
}

export default HistorySummaryCard
