"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import clsx from "clsx"
import { RotateCcw } from "lucide-react"
import { Widget } from "@/components/Widget/Index"
import MobilePageHeader from "@/components/MobilePageHeader"
import SwapHistory from "./index"
import RecoverSwapDialog from "./RecoverSwapDialog"

export default function TransactionsView() {
    const [recoverOpen, setRecoverOpen] = useState(false)
    const [isScrolling, setIsScrolling] = useState(false)
    const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

    const handleScroll = useCallback(() => {
        if (!isScrolling) setIsScrolling(true)
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
        scrollTimeout.current = setTimeout(() => setIsScrolling(false), 1000)
    }, [isScrolling])

    useEffect(() => () => {
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }, [])

    return (
        <div className="relative w-full">
            <div className="hidden md:flex absolute -top-12 left-0 z-10">
                <button
                    type="button"
                    onClick={() => setRecoverOpen(true)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-text bg-secondary-700 hover:bg-secondary-500 transition-colors rounded-xl px-3 py-2 border border-border"
                >
                    <RotateCcw className="h-4 w-4" />
                    <span>Recover swap</span>
                </button>
            </div>
            <MobilePageHeader />
            <Widget hideMenu>
                <div
                    onScroll={handleScroll}
                    className={clsx('openpicker pt-4 h-[79svh] overflow-y-scroll overflow-x-hidden -mr-4 pr-2 scrollbar:w-1.5! scrollbar:h-1.5! scrollbar-thumb:bg-transparent', {
                        'styled-scroll': isScrolling,
                    })}
                >
                    <SwapHistory />
                </div>
            </Widget>
            <RecoverSwapDialog open={recoverOpen} onOpenChange={setRecoverOpen} />
        </div>
    )
}
