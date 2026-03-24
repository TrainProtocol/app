import { FC, useRef, useState } from "react";
import { useSwapData } from "@/hooks/useSwapData";
import { useActiveSwapState, useClearSwapError } from "@/hooks/useActiveSwapState";
import { RevealSecretAction } from "./RevealSecret";
import { ManualClaimAction } from "./ManualClaim";
import { UserRefundAction, UserLockAction } from "./UserActions";
import TransactionMessages from "@/components/Swap/messages/TransactionMessages";
import WalletMessage from "@/components/Swap/messages/Message";
import DestinationWalletWrapper from "./DestinationWalletWrapper";
import type { SwapQuote } from "@train-protocol/sdk";
import SubmitButton from "@/components/buttons/submitButton";
import { ExternalLink, Home } from "lucide-react";
import { useGoHome } from "@/hooks/useGoHome";
import { getExplorerUrl } from "@/lib/address";
import NetworkSettings from "@/lib/NetworkSettings";
import { Widget } from "@/components/Widget/Index";
import { useSwapPreferencesStore } from "@/stores/swapPreferencesStore";
import { useRevealSecret } from "@/hooks/htlc/useRevealSecret";
import { useSolverLockVerification } from "@/hooks/htlc/useSolverLockVerification";
import { useLoginIdentityMismatch, useSwap as useSwapRead } from "@train-protocol/react";
import { useSwapStore } from "@/stores/swapStore";
import { Drawer } from "@/components/Modal/vaul";
import { HTLCStatus } from "@/Models/HTLCStatus";

export type SwapViewType = "widget" | "contained"

type ActionsProps = {
    quote?: SwapQuote
    solverId?: string
    type: SwapViewType
}

export const Actions: FC<ActionsProps> = ({ quote, solverId, type }) => {
    const { status: commitStatus, error } = useActiveSwapState()

    return (
        <>
            {error && <TransactionMessage error={error.message} />}
            <DestinationWalletWrapper>
                <ResolveAction
                    commitStatus={commitStatus}
                    error={error?.message}
                    quote={quote}
                    solverId={solverId}
                    type={type}
                />
            </DestinationWalletWrapper>
        </>
    )
}

type ResolveActionProps = {
    commitStatus: HTLCStatus
    disableButton?: boolean
    error: string | undefined
    quote?: SwapQuote
    solverId?: string
    type: SwapViewType
}

const ResolveAction: FC<ResolveActionProps> = ({ commitStatus, error, quote, solverId, type }) => {
    const clearError = useClearSwapError()

    // Verification/reveal errors: no button at all — revealing would be unsafe
    const isVerificationError = error && (
        error.includes('verification failed') || error.includes('VERIFICATION_FAILED') ||
        error.includes('Cannot reveal') || error.includes('REVEAL_FAILED')
    )

    if (isVerificationError) {
        return <></>
    }

    if (error) {
        return (
            <SubmitButton type="button" onClick={clearError}>
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
            return <UserLockAction quote={quote} solverId={solverId} type={type} />
    }
}

const SolverLockDetectedAction: FC<{ type: SwapViewType }> = ({ type }) => {
    const { autoRevealSecret, hasSeenAutoRevealPrompt } = useSwapPreferencesStore()
    const { revealSecret } = useRevealSecret()
    const [autoRevealFailed, setAutoRevealFailed] = useState(false)
    const { verified, skipped, mismatches } = useSolverLockVerification()
    const { consensusVerified, consensusVerifying } = useActiveSwapState()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const currentSwap = useSwapRead(activeHashlock)
    const { warning } = useLoginIdentityMismatch(currentSwap?.loginIdentity)

    // Wait for both quote verification AND multi-RPC consensus before revealing
    const consensusReady = consensusVerified || skipped
    const shouldAutoReveal = autoRevealSecret && hasSeenAutoRevealPrompt && !autoRevealFailed && verified && consensusReady

    if (warning) {
        return <WalletMessage status="warning" header={warning.header} details={warning.details} />
    }
    // Wait for consensus verification before allowing secret reveal
    if (consensusVerifying) return <></>

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
    const { destination_network, source_network, refundTxId } = useSwapData()
    const { destRedeemTxId } = useActiveSwapState()
    const goHome = useGoHome()

    const isSuccess = variant === 'success'
    const isModal = type === 'contained'
    const networkSlug = isSuccess ? destination_network?.caip2Id : source_network?.caip2Id
    const txHash = isSuccess ? destRedeemTxId : refundTxId
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

const TransactionMessage: FC<{ error: string | undefined, disableButton?: boolean }> = ({ error, disableButton }) => {
    if (disableButton && error) {
        return (
            <WalletMessage
                status="error"
                header="Something went wrong"
                details={error}
            />
        )
    }
    if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed" || error?.toLowerCase()?.includes('denied') || error?.toLowerCase()?.includes('user rejected')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    if (error?.includes('insufficient funds')) {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    if (error?.includes('verification failed') || error?.includes('VERIFICATION_FAILED')) {
        return <WalletMessage status="error" header="Verification failed" details={error} />
    }
    if (error?.includes('Cannot reveal') || error?.includes('REVEAL_FAILED')) {
        return <WalletMessage status="error" header="Reveal failed" details={error} />
    }

    if (error) {
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    return <></>
}
