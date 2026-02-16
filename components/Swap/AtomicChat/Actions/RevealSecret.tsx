import { FC, useState } from "react";
import { WalletActionButton } from "../../buttons";
import ButtonStatus from "./Status/ButtonStatus";
import { useRevealSecret } from "@/hooks/htlc/useRevealSecret";
import { useSwapPreferencesStore } from "@/stores/swapPreferencesStore";
import { Checkbox } from "@/components/shadcn/checkbox";

export const RevealSecretAction: FC<{ showCheckbox?: boolean }> = ({ showCheckbox = false }) => {
    const { revealSecret, isRevealing, source_network, wallet } = useRevealSecret()
    const { autoRevealSecret, setAutoRevealSecret, setHasSeenAutoRevealPrompt } = useSwapPreferencesStore()
    const [checked, setChecked] = useState(autoRevealSecret)

    const handleRevealSecret = async () => {
        if (showCheckbox) {
            setAutoRevealSecret(checked)
            setHasSeenAutoRevealPrompt(true)
        }
        await revealSecret()
    }

    if (!source_network) return <></>

    if (isRevealing) return <></>

    return <div className="font-normal flex flex-col w-full relative z-10 space-y-4 grow">
        {showCheckbox && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-primary-text-muted">
                <Checkbox
                    checked={checked}
                    onCheckedChange={(val) => setChecked(val === true)}
                />
                Reveal secret automatically for future swaps
            </label>
        )}
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
