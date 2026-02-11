import { FC, useState } from "react";
import { useAtomicState } from "../../../../context/atomicContext";
import { useSecretDerivation } from "@/context/secretDerivationContext";
import { deriveSecretFromTimelock } from "@/lib/htlc/secretDerivation";
import LayerSwapApiClient from "@/lib/trainApiClient";
import useWallet from "@/hooks/useWallet";
import { WalletActionButton } from "../../buttons";
import ButtonStatus from "./Status/ButtonStatus";
import posthog from "posthog-js";
import { useConfig } from "wagmi";

export const RevealSecretAction: FC = () => {
    const { source_network, commitId, nonce, solver, updateCommit, solverLockDetails } = useAtomicState()
    const { deriveInitialKey } = useSecretDerivation()
    const { provider } = useWallet(source_network, 'withdrawal')
    const wallet = provider?.activeWallet
    const config = useConfig()

    const [isRevealing, setIsRevealing] = useState(false)

    const handleRevealSecret = async () => {
        try {
            if (!commitId) throw new Error("No commitment ID")
            if (!nonce) throw new Error("No nonce available")
            if (!solver) throw new Error("No solver")
            if (!solverLockDetails) throw new Error("No solver lock details")

            setIsRevealing(true)

            const initialKey = await deriveInitialKey({
                chainId: Number(source_network?.chainId),
                wallet: wallet,
                config
            })

            const derivedKey = deriveSecretFromTimelock(initialKey, nonce)
            const secret = '0x' + derivedKey.toString('hex')

            const apiClient = new LayerSwapApiClient()
            await apiClient.RevealSecret({ secret }, commitId, solver)

            posthog.capture("RevealSecret", {
                commitId,
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
