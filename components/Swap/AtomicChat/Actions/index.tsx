import { FC, useEffect, useRef, useState } from "react";
import { HTLCStatus, useAtomicState } from "../../../../context/atomicContext";
import { RevealSecretAction } from "./RevealSecret";
import { ManualClaimAction } from "./ManualClaim";
import { UserRefundAction, UserCommitAction } from "./UserActions";
import TransactionMessages from "../../messages/TransactionMessages";
import WalletMessage from "../../messages/Message";
import DestinationWalletWrapper from "./DestinationWalletWrapper";
import { SwapQuote } from "../../../../lib/trainApiClient";
import SubmitButton from "@/components/buttons/submitButton";
import { ExternalLink, Home } from "lucide-react";
import { useGoHome } from "@/hooks/useGoHome";
import { getExplorerUrl } from "@/lib/address";
import NetworkSettings from "@/lib/NetworkSettings";
import { Widget } from "@/components/Widget/Index";
import { useSwapPreferencesStore } from "@/stores/swapPreferencesStore";
import { useRevealSecret } from "@/hooks/htlc/useRevealSecret";
import ButtonStatus from "./Status/ButtonStatus";

type ActionsProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

export const Actions: FC<ActionsProps> = ({ quote, isQuoteLoading = false }) => {
    const { htlcStatus: commitStatus, error } = useAtomicState()
console.log(error)
    return (
        <>
            {error && <TransactionMessage error={error.message} />}
            <DestinationWalletWrapper>
                <ResolveAction
                    commitStatus={commitStatus}
                    error={error?.message}
                    quote={quote}
                />
            </DestinationWalletWrapper>
        </>
    )
}

type ResolveActionProps = {
    commitStatus: HTLCStatus
    error: string | undefined
    quote?: SwapQuote
}

const ResolveAction: FC<ResolveActionProps> = ({ commitStatus, error, quote }) => {
    const { setError } = useAtomicState()

    if (error) {
        return (
            <SubmitButton type="button" onClick={() => setError(undefined)}>
                Try again
            </SubmitButton>
        )
    }

    switch (commitStatus) {
        case HTLCStatus.RedeemCompleted:
            return <TerminalActions variant="success" />
        case HTLCStatus.Refunded:
            return <TerminalActions variant="refund" />
        case HTLCStatus.TimelockExpired:
            return <UserRefundAction />
        case HTLCStatus.ManualClaimRequired:
            return <ManualClaimAction />
        case HTLCStatus.SecretRevealed:
            return <></>
        case HTLCStatus.SolverLockDetected:
            return <SolverLockDetectedAction />
        case HTLCStatus.UserLocked:
            return <></>
        default:
            return <UserCommitAction quote={quote} />
    }
}

const SolverLockDetectedAction: FC = () => {
    const { autoRevealSecret, hasSeenAutoRevealPrompt } = useSwapPreferencesStore()
    const { revealSecret, isRevealing } = useRevealSecret()
    const [autoRevealFailed, setAutoRevealFailed] = useState(false)
    const attemptedRef = useRef(false)

    const shouldAutoReveal = autoRevealSecret && hasSeenAutoRevealPrompt && !autoRevealFailed

    useEffect(() => {
        if (shouldAutoReveal && !attemptedRef.current) {
            attemptedRef.current = true
            revealSecret().catch(() => {
                setAutoRevealFailed(true)
            })
        }
    }, [shouldAutoReveal, revealSecret])

    if (shouldAutoReveal || isRevealing) {
        return <ButtonStatus isDisabled={true} isLoading={true}>
            Revealing secret
        </ButtonStatus>
    }

    // First time: show checkbox. After that (or on auto-reveal failure): just the button
    return <RevealSecretAction showCheckbox={!hasSeenAutoRevealPrompt} />
}

export const ActionWrapper: FC<{ children: React.ReactNode }> = ({ children }) => {
    return <Widget.Footer sticky={true} >
        {children}
    </Widget.Footer>
}

const TerminalActions: FC<{ variant: 'success' | 'refund' }> = ({ variant }) => {
    const { destRedeemTx, destination_network, refundTxId, source_network } = useAtomicState()
    const goHome = useGoHome()

    const isSuccess = variant === 'success'
    const networkSlug = isSuccess ? destination_network?.slug : source_network?.slug
    const txHash = isSuccess ? destRedeemTx : refundTxId
    const txLink = networkSlug && txHash
        ? getExplorerUrl(NetworkSettings.KnownSettings[networkSlug]?.TransactionExplorerTemplate, txHash)
        : undefined

    return (
        <div className="flex flex-row text-primary-text text-base space-x-2">
            {txLink && (
                <div className="grow">
                    <SubmitButton
                        type="button"
                        buttonStyle={isSuccess ? "filled" : "secondary"}
                        onClick={() => window.open(txLink, '_blank')}
                        icon={<ExternalLink className="h-5 w-5" />}
                        text_align="left"
                    >
                        {isSuccess ? 'View in Explorer' : 'View Refund'}
                    </SubmitButton>
                </div>
            )}
            <div className="grow">
                <SubmitButton
                    type="button"
                    buttonStyle={isSuccess ? "secondary" : "filled"}
                    onClick={() => goHome()}
                    icon={<Home className="h-5 w-5" />}
                >
                    Swap More
                </SubmitButton>
            </div>
        </div>
    )
}

const TransactionMessage: FC<{ error: string | undefined }> = ({ error }) => {
    if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed" || error?.toLowerCase()?.includes('denied') || error?.toLowerCase()?.includes('user rejected')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    if (error?.includes('insufficient funds')) {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    if (error === "Timelock expired") {
        return (
            <WalletMessage
                status="error"
                header="Timelock expired"
                details="Unfortunately the time lock was expired, continuing the transaction is not recommended, cancel & refund to receive your assets back."
            />
        )
    }
    if (error) {
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    return <></>
}
