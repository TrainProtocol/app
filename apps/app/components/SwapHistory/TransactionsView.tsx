"use client"

import { RotateCcw } from "lucide-react"
import { Widget } from "@/components/Widget/Index"
import { useAppDialogueStore } from "@/stores/appDialogueStore"
import SwapHistory from "./index"

export default function TransactionsView() {
    const openDialogue = useAppDialogueStore((s) => s.open)

    return (
        <div className="relative w-full">
            <div className="hidden md:flex absolute -top-12 right-0 z-10">
                <button
                    type="button"
                    onClick={() => openDialogue('recoverSwap')}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-text bg-secondary-500 hover:bg-secondary-400 transition-colors rounded-xl px-3 py-2"
                >
                    <RotateCcw className="h-4 w-4" />
                    <span>Recover swap</span>
                </button>
            </div>
            <Widget hideMenu>
                <div className="openpicker pt-4 h-[79svh] overflow-y-auto styled-scroll">
                    <SwapHistory />
                </div>
            </Widget>
        </div>
    )
}
