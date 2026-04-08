import { FC, useEffect, useMemo, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { useSwaps, useUpdateSwap, type SwapData, HTLCStatus, isTerminalStatus, HTLCTransaction } from '@train-protocol/react'
import { useSettingsState } from '@/context/settings'
import { Network } from '@/Models/Network'
import HistorySummaryCard from './HistorySummaryCard'
import SwapDetailsPanel from './SwapDetailsPanel'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/shadcn/accordion'
import { TrainApiClient } from '@train-protocol/sdk'
import AppSettings from '@/lib/AppSettings'
import { getDaysAgoLabel } from '@/components/utils/dateDifference'

type DateGroup = {
    dateKey: string
    label: string
    items: [string, SwapData][]
}

function buildCompletedDateGroups(terminalEntries: [string, SwapData][]): DateGroup[] {
    const sorted = [...terminalEntries].sort(([, a], [, b]) =>
        (b.createdAt ?? 0) - (a.createdAt ?? 0)
    )

    const groups: DateGroup[] = []
    for (const entry of sorted) {
        const [, swap] = entry
        const dateKey = swap.createdAt
            ? new Date(swap.createdAt).toLocaleDateString()
            : '__older__'
        const label = swap.createdAt
            ? getDaysAgoLabel(swap.createdAt)
            : 'Older'

        const last = groups[groups.length - 1]
        if (last && last.dateKey === dateKey) {
            last.items.push(entry)
        } else {
            groups.push({ dateKey, label, items: [entry] })
        }
    }
    return groups
}

const apiClient = new TrainApiClient({ baseUrl: AppSettings.TrainApiUri ?? '' })

const SwapHistory: FC = () => {
    const swaps = useSwaps()
    const updateSwap = useUpdateSwap()
    const { networks } = useSettingsState()
    const [expanded, setExpanded] = useState<string | undefined>(undefined)
    const [showAllOngoing, setShowAllOngoing] = useState(false)

    const networkByCaip2Id = useMemo(() =>
        new Map(networks.map(n => [n.caip2Id, n])),
        [networks]
    )

    const entries = useMemo(() => Object.entries(swaps).filter(([, s]) => !!s.status), [swaps])

    const ongoingEntries = useMemo(() =>
        entries
            .filter(([, s]) => !isTerminalStatus(s.status))
            .sort(([, a], [, b]) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
        [entries]
    )

    const dateGroups = useMemo(() =>
        buildCompletedDateGroups(entries.filter(([, s]) => isTerminalStatus(s.status))),
        [entries]
    )

    const hiddenOngoingCount = Math.max(0, ongoingEntries.length - 1)
    const visibleOngoing = showAllOngoing ? ongoingEntries : ongoingEntries.slice(0, 1)

    useEffect(() => {
        if (ongoingEntries.length === 0) return

        const checkExpiry = () => {
            const now = Date.now()
            Object.entries(swaps).forEach(([hashlock, swap]) => {
                if (
                    swap.timelock &&
                    !isTerminalStatus(swap.status) &&
                    swap.status !== HTLCStatus.TimelockExpired &&
                    swap.status !== HTLCStatus.ManualClaimRequired &&
                    now > swap.timelock * 1000
                ) {
                    updateSwap(hashlock, { status: HTLCStatus.TimelockExpired })
                }
            })
        }

        checkExpiry()
        const id = setInterval(checkExpiry, 10_000)
        return () => clearInterval(id)
    }, [ongoingEntries.length, swaps, updateSwap])

    useEffect(() => {
        entries.forEach(([hashlock, swap]) => {
            if (swap.status !== HTLCStatus.RedeemCompleted || swap.destTxId) return
            apiClient.getOrder(hashlock, swap.destinationSolverAddress).then(res => {
                const redeemTx = res?.order?.transactions?.find(t => t.type === HTLCTransaction.HTLCRedeem)?.hash
                if (redeemTx) updateSwap(hashlock, { destTxId: redeemTx })
            }).catch((err) => {
                console.error(`Failed to fetch redeem tx for ${hashlock}:`, err)
            })
        })
    }, [entries, updateSwap])

    if (ongoingEntries.length === 0 && dateGroups.length === 0) {
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
            {visibleOngoing.map(([hashlock, swap], idx) => {
                const sourceNetwork = networkByCaip2Id.get(swap.source ?? '')
                const destNetwork = networkByCaip2Id.get(swap.destination ?? '')
                const isLastVisible = idx === visibleOngoing.length - 1
                const shouldShowToggle = hiddenOngoingCount > 0 && isLastVisible
                return (
                    <div key={hashlock} className="flex flex-col gap-3">
                        <SwapAccordionItem
                            hashlock={hashlock}
                            swap={swap}
                            sourceNetwork={sourceNetwork}
                            destNetwork={destNetwork}
                            expanded={expanded}
                            setExpanded={setExpanded}
                        />
                        {shouldShowToggle && (
                            <div className="w-full flex justify-center my-1">
                                <button
                                    type="button"
                                    onClick={() => setShowAllOngoing(prev => !prev)}
                                    className="flex items-center gap-1 text-sm font-normal text-secondary-text hover:text-primary-text px-3 py-1 rounded-lg bg-secondary-500"
                                >
                                    {showAllOngoing ? (
                                        <ChevronUp className="transition-transform duration-200 w-6 h-6" />
                                    ) : (
                                        <span className="select-none">+{hiddenOngoingCount} more</span>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}

            {dateGroups.map(({ dateKey, label, items }) => (
                <div key={dateKey} className="flex flex-col gap-3">
                    <p className="text-sm text-secondary-text font-normal pl-2 mt-3 first:mt-0">
                        {label}
                    </p>
                    {items.map(([hashlock, swap]) => {
                        const sourceNetwork = networkByCaip2Id.get(swap.source ?? '')
                        const destNetwork = networkByCaip2Id.get(swap.destination ?? '')
                        return (
                            <SwapAccordionItem
                                key={hashlock}
                                hashlock={hashlock}
                                swap={swap}
                                sourceNetwork={sourceNetwork}
                                destNetwork={destNetwork}
                                expanded={expanded}
                                setExpanded={setExpanded}
                            />
                        )
                    })}
                </div>
            ))}
        </Accordion>
    )
}

type SwapAccordionItemProps = {
    hashlock: string
    swap: SwapData
    sourceNetwork: Network | undefined
    destNetwork: Network | undefined
    expanded: string | undefined
    setExpanded: (v: string | undefined) => void
}

const SwapAccordionItem: FC<SwapAccordionItemProps> = ({ hashlock, swap, sourceNetwork, destNetwork, expanded, setExpanded }) => (
    <AccordionItem
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
    <div className={`${className ?? ''} bg-secondary-500 rounded-xl overflow-hidden animate-pulse`}>
        <div className="grid grid-cols-12 items-center gap-2">
            <div className="col-span-6 flex items-center gap-2 p-3">
                <div className="w-8 h-8 rounded-full bg-secondary-500 shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                    <div className="h-3 rounded bg-secondary-500 w-3/4" />
                    <div className="h-2.5 rounded bg-secondary-500 w-1/2" />
                </div>
            </div>
            <div className="col-span-6 flex items-center justify-end gap-2 bg-secondary-400 p-3 rounded-xl">
                <div className="flex flex-col gap-1.5 items-end flex-1">
                    <div className="h-3 rounded bg-secondary-500 w-3/4" />
                    <div className="h-2.5 rounded bg-secondary-500 w-1/2" />
                </div>
                <div className="w-8 h-8 rounded-full bg-secondary-500 shrink-0" />
            </div>
        </div>
        <div className="h-8 bg-secondary-400 w-full" />
    </div>
)

export default SwapHistory
