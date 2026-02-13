import { FC, useEffect, useState } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import { useSecretDerivation } from "@/context/secretDerivationContext";
import { deriveSecretFromTimelock } from "@/lib/htlc/secretDerivation";
import TrainApiClient from "@/lib/trainApiClient";
import useWallet from "@/hooks/useWallet";
import { WalletActionButton } from "../../buttons";
import ButtonStatus from "./Status/ButtonStatus";
import posthog from "posthog-js";
import { useConfig } from "wagmi";

const apiClient = new TrainApiClient()

export const RevealSecretAction: FC = () => {
    const { source_network, hashlock, solver, updateCommit, solverLockDetails, sourceDetails } = useAtomicState()
    const { deriveInitialKey } = useSecretDerivation()
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const config = useConfig()

    const [isRevealing, setIsRevealing] = useState(false)

    const handleRevealSecret = async () => {
        try {
            if (!hashlock) throw new Error("No hashlock")
            if (!sourceDetails) throw new Error("No solver lock details")

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
        catch (e) {
            updateCommit('error', { message: e.details || e.message })
        }
        finally {
            setIsRevealing(false)
        }
    }

    if (!source_network) return <></>

    if (isRevealing) {
        return <ButtonStatus isDisabled={true} isLoading={true}>
            Revealing secret
        </ButtonStatus>
    }

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        <WalletActionButton
            activeChain={wallet?.chainId}
            isConnected={!!wallet}
            network={source_network}
            networkChainId={source_network.chainId}
            onClick={handleRevealSecret}
        >
            Reveal Secret
        </WalletActionButton>
    </div>
}
