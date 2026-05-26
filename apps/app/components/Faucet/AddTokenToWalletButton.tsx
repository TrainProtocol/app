"use client"

import { FC, useEffect, useState } from "react"
import { Check } from "lucide-react"
import { ExtendedNetwork } from "@/Models/Network"
import type { FaucetToken } from "@/lib/faucet/api"
import { useFaucetTokenProvider } from "@/lib/faucet/providers"
import SubmitButton from "@/components/buttons/submitButton"

type Props = {
    token: FaucetToken
    network: ExtendedNetwork
    recipient: string | null
    onError: (message: string | null) => void
}

const AddTokenToWalletButton: FC<Props> = ({ token, network, recipient, onError }) => {
    const provider = useFaucetTokenProvider(network)
    const [pending, setPending] = useState(false)
    const [phase, setPhase] = useState<"idle" | "added" | "hidden">("idle")

    useEffect(() => {
        if (phase !== "added") return
        const t = setTimeout(() => setPhase("hidden"), 1500)
        return () => clearTimeout(t)
    }, [phase])

    const onClick = async () => {
        if (!recipient || !provider) return
        setPending(true)
        onError(null)
        try {
            const added = await provider.addToWallet({ network, token, recipient })
            if (added) setPhase("added")
        } catch (err) {
            onError(err instanceof Error ? err.message : "Couldn't add token to wallet")
        } finally {
            setPending(false)
        }
    }

    if (phase === "hidden") return null
    if (!provider) return null

    const added = phase === "added"

    return (
        <SubmitButton
            type="button"
            onClick={onClick}
            isSubmitting={pending}
            isDisabled={added}
            buttonStyle="secondary"
            icon={added ? <Check className="h-5 w-5" /> : undefined}
        >
            {added ? `${token.symbol} added` : `Add ${token.symbol} to wallet`}
        </SubmitButton>
    )
}

export default AddTokenToWalletButton
