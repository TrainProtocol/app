import { useState, useCallback } from "react";
import { useAtomicState } from "@/context/atomicContext";
import { useSecretDerivation } from "@/context/secretDerivationContext";
import { deriveSecretFromTimelock } from "@/lib/htlc/secretDerivation";
import TrainApiClient from "@/lib/trainApiClient";
import useWallet from "@/hooks/useWallet";
import posthog from "posthog-js";
import { useConfig } from "wagmi";

const apiClient = new TrainApiClient()

export function useRevealSecret() {
    const { source_network, hashlock, solver, updateCommit, sourceDetails } = useAtomicState()
    const { deriveInitialKey } = useSecretDerivation()
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const config = useConfig()

    const [isRevealing, setIsRevealing] = useState(false)

    const revealSecret = useCallback(async () => {
        try {
            if (!hashlock) throw new Error("No hashlock")
            if (!sourceDetails) throw new Error("No source lock details")

            setIsRevealing(true)

            const initialKey = await deriveInitialKey({
                wallet: wallet,
                config
            })

            const derivedKey = deriveSecretFromTimelock(initialKey, Number(sourceDetails?.userData))
            const secret = '0x' + derivedKey.toString('hex')

            await apiClient.RevealSecret({ secret }, hashlock, solver)

            posthog.capture("RevealSecret", {
                hashlock,
                solver,
            })

            updateCommit('secretRevealed', true)
        }
        catch (e: any) {
            updateCommit('error', { message: e.details || e.message })
            throw e
        }
        finally {
            setIsRevealing(false)
        }
    }, [hashlock, sourceDetails, wallet, config, solver, deriveInitialKey, updateCommit])

    return { revealSecret, isRevealing, source_network, wallet }
}
