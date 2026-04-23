"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import SettingsView from "@/components/Settings/SettingsView";

export default function SettingsPage() {
    const router = useRouter()
    useEffect(() => {
        if (window.innerWidth < 768) router.replace('/')
    }, [router])
    return <SettingsView />;
}
