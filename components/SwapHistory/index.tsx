import { FC, useEffect, useMemo, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { useSwapStore } from '@/stores/swapStore'
import { useSettingsState } from '@/context/settings'
import { HTLCStatus } from '@/Models/HTLCStatus'
import HistorySummaryCard from './HistorySummaryCard'
import SwapDetailsPanel from './SwapDetailsPanel'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/shadcn/accordion'
import TrainApiClient, { HTLCTransaction } from '@/lib/trainApiClient'

const apiClient = new TrainApiClient()

const SwapHistory: FC = () => {
    const swaps = useSwapStore(s => s.swaps)
    const updateSwap = useSwapStore(s => s.updateSwap)
    const { networks } = useSettingsState()
    const [expanded, setExpanded] = useState<string | undefined>(undefined)

    const isTerminal = (status: HTLCStatus | undefined) =>
        status === HTLCStatus.RedeemCompleted || status === HTLCStatus.Refunded

    const sortedSwaps = useMemo(() => {
        const entries = Object.entries(swaps)
        const inProgress = entries.filter(([, s]) => s.status && !isTerminal(s.status))
        const terminal = entries.filter(([, s]) => isTerminal(s.status)).reverse()
        return [...inProgress, ...terminal]
    }, [swaps])

    useEffect(() => {
        sortedSwaps.forEach(([hashlock, swap]) => {
            if (swap.status !== HTLCStatus.RedeemCompleted || swap.destTxId || !swap.solver) return
            apiClient.GetOrder(swap.solver, hashlock).then(res => {
                const redeemTx = res?.data?.order?.transactions?.find(t => t.type === HTLCTransaction.HTLCRedeem)?.hash
                if (redeemTx) updateSwap(hashlock, { destTxId: redeemTx })
            }).catch(() => { })
        })
    }, [])

    if (sortedSwaps.length === 0) {
        return <EmptyState />
    }

    return (
        <Accordion
            type="single"
            collapsible
            value={expanded}
            onValueChange={(v: string | undefined) => setExpanded(v)}
            className="w-full flex flex-col gap-3"
        >
            {sortedSwaps.map(([hashlock, swap]) => {
                const sourceNetwork = networks.find(
                    n => n.caip2Id.toUpperCase() === swap.source?.toUpperCase()
                )
                const destNetwork = networks.find(
                    n => n.caip2Id.toUpperCase() === swap.destination?.toUpperCase()
                )
                return (
                    <AccordionItem
                        key={hashlock}
                        value={hashlock}
                        className="border-none bg-secondary-500 rounded-3xl"
                    >
                        <AccordionTrigger className={`rounded-3xl w-full transition-shadow ${expanded === hashlock ? 'shadow-accordion-open' : ''}`}>
                            <HistorySummaryCard
                                swap={swap}
                                sourceNetwork={sourceNetwork}
                                destNetwork={destNetwork}
                            />
                        </AccordionTrigger>
                        <AccordionContent className="-mt-3">
                            <div className="flex items-center justify-center px-4 pt-3 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setExpanded(undefined)}
                                    className="inline-flex items-center gap-1 leading-5 text-sm text-secondary-text hover:text-primary-text transition-colors"
                                >
                                    <span>Hide details</span>
                                    <ChevronUp className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="px-4 pb-4">
                                <SwapDetailsPanel
                                    swap={swap}
                                    sourceNetwork={sourceNetwork}
                                    destNetwork={destNetwork}
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    )
}

const EmptyState = () => (
    <div className="w-full flex flex-col justify-center items-center py-10 gap-6">
        <div className="relative">
            <SkeletonCard className="scale-[.63] w-72 shadow-card mr-7" />
            <SkeletonCard className="scale-[.63] -mt-12 shadow-card ml-7 w-72" />
        </div>
        <div className="text-center space-y-2">
            <h1 className="text-secondary-text text-2xl font-bold tracking-wide">
                No Swap History
            </h1>
            <p className="max-w-xs text-center text-primary-text-tertiary text-sm font-normal mx-auto">
                Your swaps will appear here.
            </p>
        </div>
    </div>
)

const SkeletonCard = ({ className }: { className?: string }) => (
    <div className={`${className ?? ''} bg-secondary-700 rounded-xl overflow-hidden animate-pulse`}>
        <div className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-6 flex items-center gap-2 p-3">
                <div className="w-8 h-8 rounded-full bg-secondary-500 shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 rounded bg-secondary-500 w-3/4" />
                    <div className="h-2.5 rounded bg-secondary-500 w-1/2" />
                </div>
            </div>
            <div className="col-span-6 flex items-center justify-end gap-2 bg-secondary-600 p-3 rounded-xl">
                <div className="flex flex-col gap-1.5 items-end flex-1">
                    <div className="h-3 rounded bg-secondary-500 w-3/4" />
                    <div className="h-2.5 rounded bg-secondary-500 w-1/2" />
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary-500 shrink-0" />
            </div>
        </div>
        <div className="h-8 bg-secondary-600 w-full" />
    </div>
)

export default SwapHistory
