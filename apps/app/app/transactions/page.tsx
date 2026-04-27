"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import TransactionsView from "@/components/SwapHistory/TransactionsView";
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"

export default function TransactionsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    useEffect(() => {
        if (window.innerWidth < 768) {
            router.replace(buildHrefWithPersistantParams("/", searchParams))
        }
    }, [router, searchParams])
    if (typeof window !== 'undefined' && window.innerWidth < 768) return null
    return <TransactionsView />;
}
