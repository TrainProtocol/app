import { useState, useCallback } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import useWallet from "@/hooks/useWallet";
import posthog from "posthog-js";
import { useRevealSecret as useRevealSecretHook } from "@train-protocol/react";
import { useSwapStore } from "@/stores/swapStore";

export function useRevealSecret() {
    const { sourceNetwork, hashlock, solver } = useActiveSwap()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { reveal: revealSecretAction } = useRevealSecretHook()
    const { provider } = useWallet(sourceNetwork, 'withdrawal')
    const wallet = provider?.activeWallet

    const [isRevealing, setIsRevealing] = useState(false)

    const revealSecret = useCallback(async () => {
        try {
            if (!activeHashlock) throw new Error("No hashlock")

            setIsRevealing(true)

            await revealSecretAction(activeHashlock)

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
    }, [activeHashlock, hashlock, solver, revealSecretAction])

    return { revealSecret, isRevealing, source_network: sourceNetwork, wallet }
}
