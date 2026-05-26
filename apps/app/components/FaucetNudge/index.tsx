"use client"

import { FC } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useFormikContext } from "formik"
import { Droplet, ArrowRight } from "lucide-react"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { useNetworkBalance, useSelectedAccount } from "@/context/swapAccounts"
import { mintedKey, useFaucetNudgeStore } from "@/stores/faucetNudgeStore"
import { SwapFormValues } from "@/components/DTOs/SwapFormValues"
import AppSettings from "@/lib/AppSettings"

const FAUCET_TOKEN = "TESTUSDC"
const RECENT_MINT_WINDOW_MS = 120_000

function useFaucetNudgeHref(caip2Id: string | undefined, tokenSymbol: string | undefined,): string | null {
    const entry = useNetworkBalance("from", caip2Id)
    const selectedSource = useSelectedAccount("from", caip2Id)
    const searchParams = useSearchParams()
    const mintedAt = useFaucetNudgeStore(s =>
        caip2Id && tokenSymbol ? s.mintedAt[mintedKey(caip2Id, tokenSymbol)] : undefined
    )

    if (AppSettings.ApiVersion !== "sandbox" || !caip2Id || tokenSymbol?.toUpperCase() !== FAUCET_TOKEN) return null
    if (mintedAt && Date.now() - mintedAt < RECENT_MINT_WINDOW_MS) return null
    if (!entry?.data) return null

    const hasTestUsdc = entry.data.balances?.some(b =>
        b.token?.toUpperCase() === FAUCET_TOKEN &&
        typeof b.amount === "number" &&
        b.amount > 0
    )
    if (hasTestUsdc) return null

    return buildHrefWithPersistantParams("/faucet", searchParams, {
        from: caip2Id,
        fromAsset: tokenSymbol,
        sourceAddress: selectedSource?.address,
    })
}

export const FaucetNudgePill: FC = () => {
    const { values } = useFormikContext<SwapFormValues>()
    const { isMobile } = useWindowDimensions()
    const href = useFaucetNudgeHref(values.from?.caip2Id, values.fromCurrency?.symbol)
    if (!isMobile || !href) return null
    return (
        <div className="flex justify-center">
            <Link
                href={href}
                prefetch={true}
                className="inline-flex items-center gap-2 px-3 py-[7px] rounded-full border border-[rgba(255,122,26,0.28)] bg-[rgba(255,122,26,0.12)] text-[11px] text-[#ededed] animate-in fade-in duration-200"
            >
                <Droplet size={12} strokeWidth={2} className="text-[#ff7a1a]" />
                <span>Need test tokens? <span className="font-semibold text-[#ff7a1a]">Get from faucet</span></span>
                <ArrowRight size={10} strokeWidth={2} className="text-[#ff7a1a]" />
            </Link>
        </div>
    )
}

export const FaucetNudgeChip: FC = () => {
    const caip2Id = useFaucetNudgeStore(s => s.caip2Id)
    const tokenSymbol = useFaucetNudgeStore(s => s.tokenSymbol)
    const { isDesktop } = useWindowDimensions()
    const href = useFaucetNudgeHref(caip2Id, tokenSymbol)
    if (!isDesktop || !href) return null
    return (
        <Link
            href={href}
            prefetch={true}
            className="fixed bottom-6 right-6 [body:has(.intercom-launcher-frame,.intercom-lightweight-app-launcher)_&]:right-20 z-40 flex items-center gap-2.5 px-3.5 py-2.5 rounded-full cursor-pointer bg-[#ff7a1a] text-white text-xs font-semibold transition-all duration-150 animate-in fade-in"
        >
            <Droplet size={14} strokeWidth={2} className="text-white" />
            <span>Need test tokens?</span>
            <ArrowRight size={12} strokeWidth={2} className="text-white" />
        </Link>
    )
}
