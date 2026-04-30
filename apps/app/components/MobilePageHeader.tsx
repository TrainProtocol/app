"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import HeaderWithMenu from "./HeaderWithMenu"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"

export default function MobilePageHeader() {
    const router = useRouter()
    const { isMobile } = useWindowDimensions()

    useEffect(() => {
        router.prefetch("/")
    }, [router])

    const goBack = useCallback(() => {
        if (window?.['navigation']?.['canGoBack']) {
            router.back()
            return
        }
        const sp = new URLSearchParams(window.location.search)
        router.push(buildHrefWithPersistantParams("/", sp))
    }, [router])

    if (!isMobile) return null
    return <HeaderWithMenu goBack={goBack} />
}
