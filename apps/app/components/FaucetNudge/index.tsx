"use client"

import { FC } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Droplet, ArrowRight } from "lucide-react"
import { getKey, useBalanceStore } from "@/stores/balanceStore"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { useSwapAccounts } from "@/context/swapAccounts"
import AppSettings from "@/lib/AppSettings"

const FAUCET_TOKEN = "TESTUSDC"

function useFaucetNudgeHref() {
    const balances = useBalanceStore(s => s.balances)
    const searchParams = useSearchParams()
    const swapAccounts = useSwapAccounts("from")

    if (AppSettings.ApiVersion !== "sandbox") return null

    let anyLoading = false
    const hasTestUsdc = swapAccounts.some(account => {
        const networks = account.walletWithdrawalSupportedNetworks ?? []
        return networks.some(caip2Id => {
            const entry = balances[getKey(account.address, caip2Id)]
            if (!entry || entry.status === "loading") {
                anyLoading = true
                return false
            }
            return entry.data?.balances?.some(b =>
                b.token?.toUpperCase() === FAUCET_TOKEN &&
                typeof b.amount === "number" &&
                b.amount > 0
            )
        })
    })
    if (hasTestUsdc || anyLoading) return null

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
