"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import TransactionsView from "@/components/SwapHistory/TransactionsView";

export default function TransactionsPage() {
    const router = useRouter()
    useEffect(() => {
        if (window.innerWidth < 768) router.replace('/')
    }, [router])
    return <TransactionsView />;
}
