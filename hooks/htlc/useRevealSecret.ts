import { useState, useCallback } from "react";
import { useAtomicState } from "@/context/atomicContext";
import { useSecretDerivation } from "@/context/secretDerivationContext";
import TrainApiClient from "@/lib/trainApiClient";
import useWallet from "@/hooks/useWallet";
import posthog from "posthog-js";
import { useConfig } from "wagmi";

const apiClient = new TrainApiClient()

export function useRevealSecret() {
    const { source_network, hashlock, solver, updateHTLC: updateCommit, setError, sourceDetails } = useAtomicState()
    const { deriveSecret } = useSecretDerivation()
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const config = useConfig()

    const [isRevealing, setIsRevealing] = useState(false)

    const revealSecret = useCallback(async () => {
        try {
            if (!hashlock) throw new Error("No hashlock")
            if (!sourceDetails) throw new Error("No source lock details")

            setIsRevealing(true)
            const timestamp = Number(sourceDetails?.userData)

            if (isNaN(timestamp)) throw new Error("Invalid timestamp")

            const { secret } = await deriveSecret({
                wallet,
                nonce: timestamp,
                config
            })

            await apiClient.RevealSecret({ secret }, hashlock, solver)

            posthog.capture("RevealSecret", {
                hashlock,
                solver,
            })

            updateCommit('secretRevealed', true)
        }
        catch (e: any) {
            setError({ message: e.details || e.message })
            throw e
        }
        finally {
            setIsRevealing(false)
        }
    }, [hashlock, sourceDetails, wallet, config, solver, deriveSecret, updateCommit])

    return { revealSecret, isRevealing, source_network, wallet }
}
