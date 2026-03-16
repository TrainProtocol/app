import { useState, useCallback } from "react";
import { useSwapData } from "@/hooks/useSwapData";
import useWallet from "@/hooks/useWallet";
import posthog from "posthog-js";
import { useSwap, useSwapActions } from "@train-protocol/react";

export function useRevealSecret() {
    const { source_network, hashlock, solver } = useSwapData()
    const { revealSecret: revealSecretAction, setError } = useSwap()
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet

    const { updateSwap } = useSwapActions()
    const [isRevealing, setIsRevealing] = useState(false)

    const revealSecret = useCallback(async () => {
        try {
            if (!hashlock) throw new Error("No hashlock")

            setIsRevealing(true)

            await revealSecretAction()

            posthog.capture("RevealSecret", {
                hashlock,
                solver,
            })

            updateSwap(hashlock, { secretRevealed: true })
        }
        catch (e: any) {
            setError(new Error(e.details || e.message))
            throw e
        }
        finally {
            setIsRevealing(false)
        }
    }, [hashlock, solver, revealSecretAction, updateSwap, setError])

    return { revealSecret, isRevealing, source_network, wallet }
}
