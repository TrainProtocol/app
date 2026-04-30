import { useCallback } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import posthog from "posthog-js";
import { useRevealSecret as useRevealSecretHook } from "@train-protocol/react";
import { useSwapStore } from "@/stores/swapStore";

export function useRevealSecret() {
    const { hashlock } = useActiveSwap()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { reveal: revealSecretAction } = useRevealSecretHook()

    const revealSecret = useCallback(async () => {
        if (!activeHashlock) throw new Error("No hashlock")

        await revealSecretAction(activeHashlock)

        posthog.capture("RevealSecret", {
            hashlock,
        })
    }, [activeHashlock, hashlock, revealSecretAction])

    return { revealSecret }
}
