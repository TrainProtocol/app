import { FC } from "react";
import { HTLCStatus, useAtomicState } from "../../../../context/atomicContext";
import { SolverLockingAssets } from "./SolverLock";
import { RevealSecretAction } from "./RevealSecret";
import { WaitForSolverRedeem } from "./WaitForSolverRedeem";
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

type ActionsProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

export const Actions: FC<ActionsProps> = ({ quote, isQuoteLoading = false }) => {
    const { htlcStatus: commitStatus, error } = useAtomicState()

    return (
        <div className="w-full space-y-3 h-fit text-primary-text">
            {error && <TransactionMessage error={error.message} />}
            <DestinationWalletWrapper>
                <ResolveAction
                    commitStatus={commitStatus}
                    error={error?.message}
                    quote={quote}
                />
            </DestinationWalletWrapper>
        </div>
    )
}

type ResolveActionProps = {
    commitStatus: HTLCStatus
    error: string | undefined
    quote?: SwapQuote
}

const ResolveAction: FC<ResolveActionProps> = ({ commitStatus, error, quote }) => {
    const { updateCommit } = useAtomicState()

    if (error) {
        return (
            <SubmitButton type="button" onClick={() => updateCommit('error', undefined)}>
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
        case HTLCStatus.SecretRevealed:
            return <WaitForSolverRedeem />
        case HTLCStatus.SolverLockDetected:
            return <RevealSecretAction />
        case HTLCStatus.UserLocked:
            return <SolverLockingAssets />
        default:
            return <UserCommitAction quote={quote} />
    }
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
