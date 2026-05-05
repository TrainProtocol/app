import { FC } from "react"
import { ExtendedNetwork } from "@/Models/Network"
import { Address, getExplorerUrl } from "@/lib/address"
import SubmitButton from "@/components/buttons/submitButton"
import Timeline from "@/components/Swap/AtomicChat/AtomicContent/Timeline"
import { StepStatus } from "@/components/Swap/AtomicChat/AtomicContent/progressTypes"
import { ImageWithFallback } from "@/components/Common/ImageWithFallback"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"
import WalletMessage from "@/components/Swap/messages/Message"

export type MintPhase = 'preparing' | 'awaiting_signature' | 'confirming' | 'success'

type MintAttemptBase = {
    network: ExtendedNetwork
    recipient: string
    symbol?: string
    amount?: string
    error?: string
}

export type MintAttempt = MintAttemptBase & (
    | { phase: 'preparing' | 'awaiting_signature'; txHash?: undefined }
    | { phase: 'confirming' | 'success'; txHash: `0x${string}` }
)

const STEPS = [
    ['preparing', 'Preparing transaction'],
    ['awaiting_signature', 'Confirm in your wallet'],
    ['confirming', 'Confirming on-chain'],
    ['success', 'Tokens minted'],
] as const

type Props = {
    attempt: MintAttempt
    onClose: () => void
}

const FaucetMintProgress: FC<Props> = ({ attempt, onClose }) => {
    const { phase, network, recipient, symbol, amount, txHash, error } = attempt
    const failed = !!error
    const phaseIdx = STEPS.findIndex(([key]) => key === phase)
    const txLink = txHash ? getExplorerUrl(network.explorerUrlTemplate?.transaction, txHash) : undefined
    const isTerminal = phase === 'success' || failed

    const steps = STEPS.map(([key, name], idx) => ({
        name,
        status:
            idx < phaseIdx ? StepStatus.Complete
                : idx === phaseIdx ? (failed ? StepStatus.Failed : phase === 'success' ? StepStatus.Complete : StepStatus.Current)
                    : StepStatus.Upcoming,
        txLink: key === 'confirming' ? txLink : undefined,
    }))

    return (
        <div className="space-y-4">
            {symbol && amount && (
                <div className="bg-secondary-500 rounded-2xl px-3 py-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            {network.logoUrl && (
                                <ImageWithFallback
                                    src={network.logoUrl}
                                    alt={network.displayName}
                                    height="32"
                                    width="32"
                                    loading="eager"
                                    className="h-8 w-8 rounded-md object-contain shrink-0"
                                />
                            )}
                            <p className="text-secondary-text text-sm truncate font-medium">{network.displayName}</p>
                        </div>
                        <p className="text-primary-text text-xl font-medium whitespace-nowrap">{amount} {symbol}</p>
                    </div>
                    <div className="border-t border-secondary-400 pt-3 flex items-center justify-between text-sm">
                        <span className="text-secondary-text">Recipient</span>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-primary-text font-medium cursor-default">{new Address(recipient, network).toShortString()}</span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="break-all max-w-[280px]">{recipient}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            )}
            <Timeline steps={steps} />
            {failed && error && <WalletMessage status="error" header="Mint failed" details={error} />}
            {isTerminal && <SubmitButton type="button" onClick={onClose}>Close</SubmitButton>}
        </div>
    )
}

export default FaucetMintProgress
