import { useState, useCallback } from "react";
import { useAtomicState } from "@/context/atomicContext";
import { useSecretDerivation } from "@/context/secretDerivationContext";
import useWallet from "@/hooks/useWallet";
import posthog from "posthog-js";
import { useSwapStore } from "@/stores/swapStore";

export function useRevealSecret() {
    const { source_network, hashlock, solver, updateHTLC, setError, sourceDetails, sourceClient } = useAtomicState()
    const { deriveSecret } = useSecretDerivation()
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet

    const updateSwap = useSwapStore(s => s.updateSwap)
    const [isRevealing, setIsRevealing] = useState(false)

    const revealSecret = useCallback(async () => {
        try {
            if (!hashlock) throw new Error("No hashlock")
            if (!sourceDetails) throw new Error("No source lock details")
            if (!sourceClient) throw new Error("No HTLC client available")

            setIsRevealing(true)
            const timestamp = Number(sourceDetails?.userData)

            if (isNaN(timestamp)) throw new Error("Invalid timestamp")

            const { secret } = await deriveSecret({
                wallet,
                nonce: timestamp,
            })

            await sourceClient.revealSecret(solver, hashlock, secret)

            posthog.capture("RevealSecret", {
                hashlock,
                solver,
            })

            updateHTLC('secretRevealed', true)
            updateSwap(hashlock, { secretRevealed: true })
        }
        catch (e: any) {
            setError({ message: e.details || e.message })
            throw e
        }
        finally {
            setIsRevealing(false)
        }
    }, [hashlock, sourceDetails, sourceClient, wallet, solver, deriveSecret, updateHTLC, updateSwap])

    return { revealSecret, isRevealing, source_network, wallet }
}
