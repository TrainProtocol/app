import { useState, useCallback } from "react";
import { useSwapData } from "@/hooks/useSwapData";
import useWallet from "@/hooks/useWallet";
import posthog from "posthog-js";
import { useRevealSecret as useRevealSecretHook } from "@train-protocol/react";
import { useSwapStore } from "@/stores/swapStore";

export function useRevealSecret() {
    const { source_network, hashlock, solver } = useSwapData()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { reveal: revealSecretAction } = useRevealSecretHook(activeHashlock)
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet

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
        }
        catch (e: any) {
            throw e
        }
        finally {
            setIsRevealing(false)
        }
    }, [hashlock, solver, revealSecretAction])

    return { revealSecret, isRevealing, source_network, wallet }
}
