"use client"

import { FC } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useFormikContext } from "formik"
import { Droplet, ArrowRight } from "lucide-react"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { useNetworkBalance } from "@/context/swapAccounts"
import { SwapFormValues } from "@/components/DTOs/SwapFormValues"
import AppSettings from "@/lib/AppSettings"

const FAUCET_TOKEN = "TESTUSDC"

function useFaucetNudgeHref() {
    const { values } = useFormikContext<SwapFormValues>()
    const entry = useNetworkBalance("from", values.from?.caip2Id)
    const searchParams = useSearchParams()

    if (AppSettings.ApiVersion !== "sandbox" || !values.from || !entry?.data) return null

    const hasTestUsdc = entry.data.balances?.some(b =>
        b.token?.toUpperCase() === FAUCET_TOKEN &&
        typeof b.amount === "number" &&
        b.amount > 0
    )
    if (hasTestUsdc) return null

    return buildHrefWithPersistantParams("/faucet", searchParams)
}

export const FaucetNudgePill: FC = () => {
    const href = useFaucetNudgeHref()
    const { isMobile } = useWindowDimensions()
    if (!href || !isMobile) return null
    return (
        <div className="flex justify-center">
            <Link
                href={href}
                className="inline-flex items-center gap-2 px-3 py-[7px] rounded-full border border-[rgba(255,122,26,0.28)] bg-[rgba(255,122,26,0.12)] text-[11px] text-[#ededed] animate-in fade-in duration-200"
            >
                <Droplet size={12} strokeWidth={2} className="text-[#ff7a1a]" />
                <span>No test USDC? <span className="font-semibold text-[#ff7a1a]">Get from faucet</span></span>
                <ArrowRight size={10} strokeWidth={2} className="text-[#ff7a1a]" />
            </Link>
        </div>
    )
}

export const FaucetNudgeChip: FC = () => {
    const href = useFaucetNudgeHref()
    const { isDesktop } = useWindowDimensions()
    if (!href || !isDesktop) return null
    return (
        <Link
            href={href}
            className="fixed bottom-6 right-6 [body:has(.intercom-launcher-frame,.intercom-lightweight-app-launcher)_&]:right-20 z-40 flex items-center gap-2.5 px-3.5 py-2.5 rounded-full cursor-pointer bg-[#ff7a1a] text-white text-xs font-semibold transition-all duration-150 animate-in fade-in"
        >
            <Droplet size={14} strokeWidth={2} className="text-white" />
            <span>Need test USDC?</span>
            <ArrowRight size={12} strokeWidth={2} className="text-white" />
        </Link>
    )
}
