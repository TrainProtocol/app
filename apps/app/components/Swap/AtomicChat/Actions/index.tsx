import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useActiveSwap, useClearSwapError, useMarkVerifiedManually } from "@/hooks/useActiveSwap";
import { ManualRedeemAction } from "./ManualClaim";
import { UserRefundAction, UserLockAction } from "./UserActions";
import TransactionMessages from "@/components/Swap/messages/TransactionMessages";
import WalletMessage from "@/components/Swap/messages/Message";
import DestinationWalletWrapper from "./DestinationWalletWrapper";
import { SwapQuote, TrainErrorCode } from "@train-protocol/react";
import SubmitButton from "@/components/buttons/submitButton";
import { ExternalLink, Home } from "lucide-react";
import { useGoHome } from "@/hooks/useGoHome";
import { getExplorerUrl } from "@/lib/address";
import { Widget } from "@/components/Widget/Index";
import { useRevealSecret } from "@/hooks/htlc/useRevealSecret";
import { useSolverLockVerification } from "@/hooks/htlc/useSolverLockVerification";
import { useLoginIdentityMismatch, useRecoveryIdentityCheck, HTLCStatus } from "@train-protocol/react";
import { useSwapStore } from "@/stores/swapStore";
import { Drawer } from "@/components/Modal/vaul";
import type { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import useWindowDimensions from "@/hooks/useWindowDimensions";

export type SwapViewType = "widget" | "contained"

type ActionsProps = {
    quote?: SwapQuote
    solverId?: string
    type: SwapViewType
    formValues?: SwapFormValues
}

export const Actions: FC<ActionsProps> = ({ quote, solverId, type, formValues }) => {
    const { status: commitStatus, error } = useActiveSwap()
    const [actionError, setActionError] = useState<Error | undefined>(undefined)

    const displayError = error?.message ?? actionError?.message
    const displayErrorCode = error?.code

    return (
        <>
            {displayError && <TransactionMessage error={displayError} errorCode={displayErrorCode} />}
            <DestinationWalletWrapper type={type}>
                <ActionWrapper type={type} mobileOnly>
                    <ResolveAction
                        commitStatus={commitStatus}
                        error={error?.message}
                        errorCode={error?.code}
                        actionError={actionError}
                        setActionError={setActionError}
                        quote={quote}
                        solverId={solverId}
                        type={type}
                        formValues={formValues}
                    />
                </ActionWrapper>
            </DestinationWalletWrapper>
        </>
    )
}

type ResolveActionProps = {
    commitStatus: HTLCStatus
    error: string | undefined
    errorCode?: TrainErrorCode
    actionError?: Error
    setActionError: (error: Error | undefined) => void
    quote?: SwapQuote
    solverId?: string
    type: SwapViewType
    formValues?: SwapFormValues
}

const ResolveAction: FC<ResolveActionProps> = ({ commitStatus, error, errorCode, actionError, setActionError, quote, solverId, type, formValues }) => {
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const goHome = useGoHome()

    if ((error && errorCode === TrainErrorCode.UserLockTransactionFailed) || actionError) {
        const handleRetry = () => {
            setActionError(undefined)
            if (error) {
                setActiveHashlock(null)
                if (type === 'widget') {
                    goHome()
                }
            }
        }

        return (
            <SubmitButton type="button" onClick={handleRetry}>
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
            return <ManualRedeemAction type={type} />
        case HTLCStatus.SecretRevealed:
            return <></>
        case HTLCStatus.SolverLockDetected:
            return <SolverLockDetectedAction />
        case HTLCStatus.UserLocked:
            return <></>
        default:
            return <UserLockAction quote={quote} solverId={solverId} type={type} setError={setActionError} destinationAddress={formValues?.destination_address} />
    }
}

const SolverLockDetectedAction: FC = () => {
    const { revealSecret } = useRevealSecret()
    const attemptedRef = useRef(false)
    const { verified, skipped } = useSolverLockVerification()
    const { consensusVerified, consensusFailed, loginIdentity, hashlock, sourceDetails, error } = useActiveSwap()
    const clearSwapError = useClearSwapError()
    const markVerifiedManually = useMarkVerifiedManually()
    const { warning: metadataWarning } = useLoginIdentityMismatch(loginIdentity ?? undefined)
    const recoveryWarning = useRecoveryIdentityCheck({
        hashlock,
        userData: sourceDetails?.userData,
        loginIdentity,
    })
    const warning = metadataWarning ?? recoveryWarning

    // Auto-reveal once multi-RPC consensus passes AND quote verification either passed or
    // was skipped (skipped means we couldn't compare against the original quote — surface a
    // warning but proceed, mirroring the previous "proceed with caution" manual flow).
    const ready = (verified || skipped) && consensusVerified && !warning
    const revealFailed = error?.code === TrainErrorCode.RevealFailed
    const verificationFailed = error?.code === TrainErrorCode.VerificationFailed || consensusFailed

    const attemptReveal = useCallback(() => {
        attemptedRef.current = true
        revealSecret().catch((err) => {
            console.error('[auto-reveal] failed:', err)
            // Allow another attempt on next state change or manual retry
            attemptedRef.current = false
        })
    }, [revealSecret])

    useEffect(() => {
        if (!ready || attemptedRef.current || revealFailed) return
        attemptReveal()
    }, [ready, revealFailed, attemptReveal])

    const handleRetry = () => {
        clearSwapError()
        attemptReveal()
    }

    if (warning) {
        return <WalletMessage status="warning" header={warning.header} details={warning.details} />
    }

    if (revealFailed) {
        return (
            <SubmitButton type="button" onClick={handleRetry}>
                Try again
            </SubmitButton>
        )
    }

    if (verificationFailed) {
        return (
            <div className="flex flex-col gap-2">
                <WalletMessage
                    status="error"
                    header="We can't verify the solver's lock"
                    details={error?.message ?? "Our RPC nodes aren't responding. You can review the solver's lock yourself and continue, or wait for the timelock to expire and refund."}
                />
                <SubmitButton type="button" onClick={markVerifiedManually}>
                    Verify and continue
                </SubmitButton>
            </div>
        )
    }

    if (skipped) {
        return (
            <WalletMessage
                status="warning"
                header="Verification skipped"
                details="Could not verify solver lock against the original quote. Wait for refund."
            />
        )
    }

    return <></>
}

export const ActionWrapper: FC<{ children: React.ReactNode, type: SwapViewType, mobileOnly?: boolean }> = ({ children, type, mobileOnly }) => {
    const { isMobile } = useWindowDimensions()
    if (mobileOnly && !isMobile) return children
    return <Widget.Footer sticky={type === 'widget'} >
        {children}
    </Widget.Footer>
}

const TerminalActions: FC<{ variant: 'success' | 'refund'; type: SwapViewType }> = ({ variant, type }) => {
    const { destinationNetwork, sourceNetwork, refundTxId, destRedeemTxId } = useActiveSwap()
    const goHome = useGoHome()

    const isSuccess = variant === 'success'
    const isModal = type === 'contained'
    const network = isSuccess ? destinationNetwork : sourceNetwork
    const txHash = isSuccess ? destRedeemTxId : refundTxId
    const txLink = network && txHash
        ? getExplorerUrl(network.explorerUrlTemplate?.transaction, txHash)
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

const TransactionMessage: FC<{ error: string | undefined, errorCode?: TrainErrorCode }> = ({ error, errorCode }) => {
    if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed" || error?.toLowerCase()?.includes('denied') || error?.toLowerCase()?.includes('user rejected')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    if (error?.includes('insufficient funds')) {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    if (error?.includes('verification failed') || error?.includes('VERIFICATION_FAILED') || errorCode === TrainErrorCode.VerificationFailed) {
        // SolverLockDetectedAction owns the verification-failed surface (message + Verify button)
        return <></>
    }
    if (error?.includes('Cannot reveal') || error?.includes('REVEAL_FAILED') || errorCode === TrainErrorCode.RevealFailed) {
        return <WalletMessage status="error" header="Reveal failed" details={error || "Secret reveal failed"} />
    }

    if (errorCode === TrainErrorCode.UserLockTransactionFailed) {
        return <></>
    }
    if (error) {
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    return <></>
}
