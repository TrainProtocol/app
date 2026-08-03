"use client"

import HeaderWithMenu from "./HeaderWithMenu"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { useGoBack } from "@/hooks/useGoBack"

export default function MobilePageHeader() {
    const { isMobile } = useWindowDimensions()
    const goBack = useGoBack()

    if (!isMobile) return null
    return <HeaderWithMenu goBack={goBack} />
}
