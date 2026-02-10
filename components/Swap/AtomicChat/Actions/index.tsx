import { FC } from "react";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import { LpLockingAssets } from "./LpLock";
import { RedeemAction } from "./Redeem";
import { UserRefundAction, UserLockAction, UserCommitAction } from "./UserActions";
import TransactionMessages from "../../messages/TransactionMessages";
import WalletMessage from "../../messages/Message";
import { Commit } from "../../../../Models/phtlc/PHTLC";
import DestinationWalletWrapper from "./DestinationWalletWrapper";
import { SwapQuote } from "../../../../lib/trainApiClient";
import SubmitButton from "@/components/buttons/submitButton";

type ResolveActionProps = {
    sourceDetails: Commit | undefined
    commitStatus: CommitStatus
    error: string | undefined
    quote?: SwapQuote
}

const ResolveAction: FC<ResolveActionProps> = ({ commitStatus, sourceDetails, error, quote }) => {
    const { updateCommit } = useAtomicState()

    // When there's an error, show a retry button that clears the error and re-renders the appropriate action
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
        if (sourceDetails?.claimed == 2) {
            return null
        }
        else {
            return <UserRefundAction />
        }
    }
    if (commitStatus === CommitStatus.AssetsLocked || commitStatus === CommitStatus.ManualClaimNeeded) {
        return <RedeemAction />
    }
    if (commitStatus === CommitStatus.LpLockDetected || commitStatus === CommitStatus.UserLocked) {
        return <UserLockAction />
    }
    if (commitStatus === CommitStatus.Commited) {
        return <LpLockingAssets />
    }
    return <UserCommitAction quote={quote} />
}

type ActionsProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

export const Actions: FC<ActionsProps> = ({ quote, isQuoteLoading = false }) => {
    const { sourceDetails, commitStatus, error } = useAtomicState()

    return (
        <div className="w-full space-y-3 h-fit text-primary-text">
            {error && <TransactionMessage error={error.message} />}
            <DestinationWalletWrapper>
                <ResolveAction
                    commitStatus={commitStatus}
                    sourceDetails={sourceDetails}
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