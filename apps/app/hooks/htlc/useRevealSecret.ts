import { useCallback } from "react";
import posthog from "posthog-js";
import { TrainError, useRevealSecret as useRevealSecretHook } from "@train-protocol/react";
import { useSwapStore } from "@/stores/swapStore";

export function useRevealSecret() {
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const { reveal: revealSecretAction } = useRevealSecretHook()

    const revealSecret = useCallback(async () => {
        if (!activeHashlock) throw new Error("No hashlock")

        try {
            await revealSecretAction(activeHashlock)
            posthog.capture("RevealSecret", { hashlock: activeHashlock })
        } catch (e) {
            console.error('[RevealSecret] failed', e)
            posthog.capture("RevealSecretFailed", {
                hashlock: activeHashlock,
                errorCode: e instanceof TrainError ? e.code : undefined,
                message: e instanceof Error ? e.message : String(e),
            })
            throw e
        }
    }, [activeHashlock, revealSecretAction])

    return { revealSecret }
}
