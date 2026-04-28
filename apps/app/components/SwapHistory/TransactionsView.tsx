"use client"

import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { Widget } from "@/components/Widget/Index"
import MobilePageHeader from "@/components/MobilePageHeader"
import SwapHistory from "./index"
import RecoverSwapDialog from "./RecoverSwapDialog"

export default function TransactionsView() {
    const [recoverOpen, setRecoverOpen] = useState(false)

    return (
        <div className="relative w-full">
            <div className="hidden md:flex absolute -top-12 right-0 z-10">
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
                <div className="openpicker pt-4 h-[79svh] overflow-y-auto styled-scroll">
                    <SwapHistory />
                </div>
            </Widget>
            <RecoverSwapDialog open={recoverOpen} onOpenChange={setRecoverOpen} />
        </div>
    )
}
