import { useEffect, useState } from "react";
import { useSwapStore } from "@/stores/swapStore";
import { useSwap, isTerminalStatus, HTLCStatus } from "@train-protocol/react";
import { useSettingsState } from "@/context/settings";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { ImageWithFallback } from "../Common/ImageWithFallback";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper";
import { buildSwapQuery } from "@/helpers/swapUrl";
import { SidebarMenuButton } from "@/components/shadcn/sidebar";

type PendingSwapProps = {
    variant?: 'header' | 'sidebar'
}

export default function PendingSwap({ variant = 'header' }: PendingSwapProps) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const swapModalOpen = useSwapStore(s => s.swapModalOpen)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const activeSwap = useSwap(activeHashlock)
    const settings = useSettingsState()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    if (!mounted || !activeHashlock || !activeSwap || !settings) return null
    const isTerminal = isTerminalStatus(activeSwap.status)
    if (isTerminal && pathname !== '/swap') return null
    if (swapModalOpen) return null
    if (variant === 'header' && pathname !== '/') return null

    const { networks } = settings
    const source_network = networks.find(n => n.caip2Id.toUpperCase() === activeSwap.source?.toUpperCase())
    const destination_network = networks.find(n => n.caip2Id.toUpperCase() === activeSwap.destination?.toUpperCase())

    const sourceLogo = source_network ? (
        <ImageWithFallback
            src={source_network.logoUrl ?? ''}
            alt="From Logo"
            height="20"
            width="20"
            className="rounded-md object-contain"
        />
    ) : null

    const destLogo = destination_network ? (
        <ImageWithFallback
            src={destination_network.logoUrl ?? ''}
            alt="To Logo"
            height="20"
            width="20"
            className="rounded-md object-contain"
        />
    ) : null

    if (variant === 'sidebar') {
        const href = activeSwap.source && activeSwap.txId
            ? buildHrefWithPersistantParams('/swap', searchParams, buildSwapQuery(activeSwap.source, activeSwap.txId))
            : '/swap'

        const swapLabel = `${activeSwap.source_asset} → ${activeSwap.destination_asset}`

        return (
            <SidebarMenuButton
                asChild
                isActive={pathname === '/swap'}
                tooltip={swapLabel}
                className="!overflow-visible"
            >
                <Link href={href} prefetch={true}>
                    <div className="relative shrink-0 h-7 w-14 transition-[width,margin] duration-300 ease-in-out group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:-ml-1">
                        <ChevronRight aria-hidden="true" className="absolute z-0 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !h-3.5 !w-3.5 text-secondary-text" />
                        <div className="absolute z-20 h-5 w-5 overflow-hidden rounded-full ring-1 ring-sidebar bg-sidebar transition-[top] duration-300 ease-in-out left-0 top-1 group-data-[collapsible=icon]:top-0">
                            {sourceLogo}
                        </div>
                        <div className="absolute z-10 h-5 w-5 overflow-hidden rounded-full ring-1 ring-sidebar bg-sidebar transition-[top] duration-300 ease-in-out right-0 top-1 group-data-[collapsible=icon]:top-2">
                            {destLogo}
                        </div>
                    </div>

                    <span className="truncate transition-[max-width,opacity] duration-300 ease-in-out max-w-32 opacity-100 group-data-[collapsible=icon]:max-w-0 group-data-[collapsible=icon]:opacity-0">{swapLabel}</span>

                    {!isTerminal && !(activeSwap.status === HTLCStatus.Initial && pathname === '/swap') && (
                        <span aria-hidden="true" className="ml-auto mr-2 relative flex h-2 w-2 shrink-0 origin-center !overflow-visible transition-[opacity,transform] duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:scale-0">
                            <span className="absolute -inset-0.5 rounded-full bg-primary opacity-70 animate-ping" />
                            <span className="relative h-2 w-2 rounded-full bg-primary shrink-0" />
                        </span>
                    )}
                </Link>
            </SidebarMenuButton>
        )
    }

    const handleClick = () => {
        setSwapModalOpen(true)
    }

    return (
        <AnimatePresence mode='wait'>
            <motion.div
                key="pendingSwap"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <div
                    onClick={handleClick}
                    className="cursor-pointer relative inline-flex items-center gap-2 p-2.5 md:py-2 md:px-3 rounded-lg md:rounded-xl bg-secondary-500 md:bg-secondary-700 md:border md:border-border text-primary-text hover:bg-secondary-500 md:hover:bg-secondary-500 transition-colors md:active:animate-press-down">
                    <div className="shrink-0 h-5 w-5 relative">{sourceLogo}</div>
                    <ChevronRight className="block h-4 w-4" />
                    <div className="shrink-0 h-5 w-5 relative block">{destLogo}</div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
