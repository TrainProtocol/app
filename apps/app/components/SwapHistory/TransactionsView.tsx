"use client"

import { Widget } from "@/components/Widget/Index"
import SwapHistory from "./index"

export default function TransactionsView() {
    return (
        <Widget hideMenu>
            <div className="openpicker pt-4 h-[79svh] overflow-y-auto styled-scroll">
                <SwapHistory />
            </div>
        </Widget>
    )
}
