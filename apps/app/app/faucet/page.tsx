"use client"

import AppSettings from "@/lib/AppSettings"
import FaucetView from "@/components/Faucet/FaucetView"
import FaucetTestnetOnly from "@/components/Faucet/FaucetTestnetOnly"

export default function FaucetPage() {
    if (AppSettings.ApiVersion !== "sandbox") return <FaucetTestnetOnly />
    return <FaucetView />
}
