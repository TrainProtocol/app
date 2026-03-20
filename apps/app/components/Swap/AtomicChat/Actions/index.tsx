import { FC, useEffect, useRef, useState } from "react";
import { useAtomicState } from "@/context/atomicContext";
import { RevealSecretAction } from "./RevealSecret";
import { ManualClaimAction } from "./ManualClaim";
import { UserRefundAction, UserLockAction } from "./UserActions";
import TransactionMessages from "@/components/Swap/messages/TransactionMessages";
import WalletMessage from "@/components/Swap/messages/Message";
import DestinationWalletWrapper from "./DestinationWalletWrapper";
import { SwapQuote } from "@/lib/trainApiClient";
import SubmitButton from "@/components/buttons/submitButton";
import { ExternalLink, Home } from "lucide-react";
import { useGoHome } from "@/hooks/useGoHome";
import { getExplorerUrl } from "@/lib/address";
import NetworkSettings from "@/lib/NetworkSettings";
import { Widget } from "@/components/Widget/Index";
import { useSwapPreferencesStore } from "@/stores/swapPreferencesStore";
import { useRevealSecret } from "@/hooks/htlc/useRevealSecret";
import { useSolverLockVerification } from "@/hooks/htlc/useSolverLockVerification";
import { Drawer } from "@/components/Modal/vaul";
import { HTLCStatus } from "@/Models/HTLCStatus";
import { useLoginIdentityMismatch } from "@/hooks/useLoginIdentityMismatch";
import { useSwapStore } from "@/stores/swapStore";
import { useShallow } from "zustand/react/shallow";
import { AppError, AppErrorCode, isActionDisabled } from "@/lib/errors";
import { TrainErrorCode } from "@train-protocol/sdk";

export type SwapViewType = "widget" | "contained"

type ActionsProps = {
    quote?: SwapQuote
    type: SwapViewType
}

export const Actions: FC<ActionsProps> = ({ quote, type }) => {
    const { htlcStatus: commitStatus, error } = useAtomicState()

    return (
        <>
            {error && <TransactionMessage error={error} />}
            <DestinationWalletWrapper>
                <ResolveAction
                    commitStatus={commitStatus}
                    error={error}
                    quote={quote}
                    type={type}
                />
            </DestinationWalletWrapper>
        </>
    )
}

type ResolveActionProps = {
    commitStatus: HTLCStatus
    error: AppError | undefined
    quote?: SwapQuote
    type: SwapViewType
}

const ResolveAction: FC<ResolveActionProps> = ({ commitStatus, error, quote, type }) => {
    const { setError } = useAtomicState()

    if (error && !isActionDisabled(error.code)) {
        return (
            <SubmitButton type="button" onClick={() => setError(undefined)}>
                Try again
            </SubmitButton>
        )
    }

    switch (commitStatus) {
        case HTLCStatus.RedeemCompleted:
            return <TerminalActions variant="success" type={type} />
        case HTLCStatus.Refunded:
            return <TerminalActions variant="refund" type={type} />
        case HTLCStatus.TimelockExpired:
            return <UserRefundAction type={type} />
        case HTLCStatus.ManualClaimRequired:
            return <ManualClaimAction type={type} />
        case HTLCStatus.SecretRevealed:
            return <></>
        case HTLCStatus.SolverLockDetected:
            return <SolverLockDetectedAction type={type} />
        case HTLCStatus.UserLocked:
            return <></>
        default:
            return <UserLockAction quote={quote} type={type} />
    }
}

const SolverLockDetectedAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { autoRevealSecret, hasSeenAutoRevealPrompt } = useSwapPreferencesStore()
    const { revealSecret } = useRevealSecret()
    const [autoRevealFailed, setAutoRevealFailed] = useState(false)
    const attemptedRef = useRef(false)
    const { verified, skipped, mismatches } = useSolverLockVerification()
    const { lightClientPending, hashlock } = useAtomicState()
    const swap = useSwapStore(useShallow(s => hashlock ? s.swaps[hashlock] : undefined))
    const { warning } = useLoginIdentityMismatch(swap?.loginIdentity)

    if (warning) {
        return <WalletMessage status="warning" header={warning.header} details={warning.details} />
    }

    const shouldAutoReveal = autoRevealSecret && hasSeenAutoRevealPrompt && !autoRevealFailed && verified && !lightClientPending

    useEffect(() => {
        if (shouldAutoReveal && !attemptedRef.current) {
            attemptedRef.current = true
            revealSecret().catch(() => {
                setAutoRevealFailed(true)
            })
        }
    }, [shouldAutoReveal, revealSecret])

    // Wait for light client verification before allowing secret reveal
    if (lightClientPending) return <></>

    if (shouldAutoReveal) return <></>

    // Verification failed — hide reveal button, progress panel shows the error
    if (!verified && !skipped && mismatches.length > 0) {
        return <></>
    }

    // First time: show checkbox. After that (or on auto-reveal failure): just the button
    return <RevealSecretAction showCheckbox={!hasSeenAutoRevealPrompt} type={type} verificationSkipped={skipped} />
}

export const ActionWrapper: FC<{ children: React.ReactNode, type: SwapViewType }> = ({ children, type }) => {
    return <Widget.Footer sticky={type === 'widget' ? true : false} >
        {children}
    </Widget.Footer>
}

const TerminalActions: FC<{ variant: 'success' | 'refund'; type: SwapViewType }> = ({ variant, type }) => {
    const { destRedeemTx, destination_network, refundTxId, source_network } = useAtomicState()
    const goHome = useGoHome()

    const isSuccess = variant === 'success'
    const isModal = type === 'contained'
    const networkSlug = isSuccess ? destination_network?.caip2Id : source_network?.caip2Id
    const txHash = isSuccess ? destRedeemTx : refundTxId
    const txLink = networkSlug && txHash
        ? getExplorerUrl(NetworkSettings.KnownSettings[networkSlug]?.TransactionExplorerTemplate, txHash)
        : undefined

    const swapMoreButton = (
        <SubmitButton
            type="button"
            buttonStyle={isSuccess ? "secondary" : "filled"}
            onClick={isModal ? undefined : () => goHome()}
            icon={<Home className="h-5 w-5" />}
        >
            Swap More
        </SubmitButton>
    )

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
                {isModal ? (
                    <Drawer.Close asChild>
                        {swapMoreButton}
                    </Drawer.Close>
                ) : (
                    swapMoreButton
                )}
            </div>
        </div>
    )
}

const TransactionMessage: FC<{ error: AppError | undefined }> = ({ error }) => {
    if (!error) return <></>
    if (isActionDisabled(error.code)) {
        return (
            <WalletMessage
                status="error"
                header="Something went wrong"
                details={error.message}
            />
        )
    }
    switch (error.code) {
        case AppErrorCode.USER_REJECTED:
            return <TransactionMessages.TransactionRejectedMessage />
        case AppErrorCode.INSUFFICIENT_FUNDS:
            return <TransactionMessages.InsufficientFundsMessage />
        case AppErrorCode.TIMELOCK_EXPIRED:
            return (
                <WalletMessage
                    status="error"
                    header="Timelock expired"
                    details="Unfortunately the time lock was expired, continuing the transaction is not recommended, cancel & refund to receive your assets back."
                />
            )
        case TrainErrorCode.API_REQUEST_FAILED:
        case TrainErrorCode.API_CLIENT_MISCONFIGURED:
            return <WalletMessage status="error" header="API error" details="Something went wrong while communicating with the server. Please try again." />
        default:
            return <TransactionMessages.UexpectedErrorMessage message={error.message} />
    }
}
