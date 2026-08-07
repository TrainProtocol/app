"use client"

import { FC, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { captureEvent, setView } from "@/lib/faro"
import useWallet from "@/hooks/useWallet"

const FaroTracker: FC = () => {
    const pathname = usePathname()
    const { wallets } = useWallet()

    useEffect(() => {
        if (pathname) setView(pathname)
    }, [pathname])

    const seenWalletsRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        if (!wallets?.length) return
        for (const wallet of wallets) {
            for (const address of wallet.addresses ?? []) {
                const key = `${wallet.providerName}:${address}`
                if (seenWalletsRef.current.has(key)) continue
                seenWalletsRef.current.add(key)
                captureEvent('wallet_connected', {
                    provider: wallet.providerName,
                    wallet_id: wallet.id,
                    address,
                })
            }
        }
    }, [wallets])

    return null
}

export default FaroTracker
