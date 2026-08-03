"use client"

import { TriangleAlert, ExternalLink } from "lucide-react"
import StatusPage from "@/components/StatusPage"

const TESTNET_FAUCET_URL = "https://testnet.train.tech/faucet"

export default function FaucetTestnetOnly() {
    return (
        <StatusPage
            tone="warning"
            icon={<TriangleAlert className="h-10 w-10 text-warning-foreground" />}
            title="Testnet only"
            description="The faucet mints test tokens, so it's only available on the testnet version of the app."
        >
            <a
                href={TESTNET_FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-400 px-5 py-4 text-base font-semibold leading-6 text-primary-text hover:bg-secondary-300 focus:outline-none transition"
            >
                <span>Open testnet faucet</span>
                <ExternalLink className="h-5 w-5" aria-hidden="true" />
            </a>
        </StatusPage>
    )
}
