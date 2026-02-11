import { FC } from "react";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import { SolverLockingAssets } from "./SolverLock";
import { RevealSecretAction } from "./RevealSecret";
import { WaitForSolverRedeem } from "./WaitForSolverRedeem";
import { UserRefundAction, UserCommitAction } from "./UserActions";
import TransactionMessages from "../../messages/TransactionMessages";
import WalletMessage from "../../messages/Message";
import { LockStatus } from "../../../../Models/phtlc/PHTLC";
import DestinationWalletWrapper from "./DestinationWalletWrapper";
import { SwapQuote } from "../../../../lib/trainApiClient";
import SubmitButton from "@/components/buttons/submitButton";

type ResolveActionProps = {
    commitStatus: CommitStatus
    error: string | undefined
    quote?: SwapQuote
}

const ResolveAction: FC<ResolveActionProps> = ({ commitStatus, error, quote }) => {
    const { updateCommit, sourceDetails } = useAtomicState()

    if (error) {
        return <SubmitButton
            type="button"
            onClick={() => updateCommit('error', undefined)}
        >
            Try again
        </SubmitButton>
    }
    if (commitStatus === CommitStatus.RedeemCompleted) {
        return null
    }
    if (commitStatus === CommitStatus.TimelockExpired) {
        if (sourceDetails?.status === LockStatus.Refunded) {
            return null
        }
        return <UserRefundAction />
    }
    if (commitStatus === CommitStatus.SecretRevealed) {
        return <WaitForSolverRedeem />
    }
    if (commitStatus === CommitStatus.SolverLockDetected) {
        return <RevealSecretAction />
    }
    if (commitStatus === CommitStatus.Commited) {
        return <SolverLockingAssets />
    }
    return <UserCommitAction quote={quote} />
}

type ActionsProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

export const Actions: FC<ActionsProps> = ({ quote, isQuoteLoading = false }) => {
    const { commitStatus, error } = useAtomicState()

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

const TransactionMessage: FC<{ error: string | undefined }> = ({ error }) => {
    if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed" || error?.toLowerCase()?.includes('denied') || error?.toLowerCase()?.includes('user rejected')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error?.includes('insufficient funds')) {
        return <TransactionMessages.InsufficientFundsMessage />
    }
    else if (error === "Timelock expired") {
        return <WalletMessage
            status="error"
            header='Timelock expired'
            details='Unfortunately the time lock was expired, continuing the transaction is not recommended, cancel & refund to receive your assets back.'
        />
    }
    else if (error) {
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}