import { FC } from "react";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import { CommitTransaction } from "../../../../lib/layerSwapApiClient";
import SubmitButton from "../../../buttons/submitButton";
import { LpLockingAssets } from "./LpLock";
import { RedeemAction } from "./Redeem";
import { UserRefundAction, UserLockAction, UserCommitAction } from "./UserActions";
import TransactionMessages from "../../messages/TransactionMessages";

const ResolveAction: FC = () => {
    const { sourceDetails, error, updateCommit, commitStatus } = useAtomicState()

    if (error) {
        return <div className="w-full space-y-2 flex flex-col justify-between h-full text-secondary-text">
            <div className="p-3 bg-secondary-600 rounded-xl">
                <TransactionMessage error={error} isLoading={false} />
            </div>
            <SubmitButton onClick={() => updateCommit('error', undefined)}>
                Try again
            </SubmitButton>
        </div >
    }
    if (commitStatus === CommitStatus.RedeemCompleted) {
        return <></>
    }
    if (commitStatus === CommitStatus.TimelockExpired) {
        if (sourceDetails?.claimed == 2) {
            return <></>
        }
        else {
            return <UserRefundAction />
        }
    }
    if (commitStatus === CommitStatus.AssetsLocked) {
        return <RedeemAction />
    }
    if (commitStatus === CommitStatus.LpLockDetected || commitStatus === CommitStatus.UserLocked) {
        return <UserLockAction />
    }
    if (commitStatus === CommitStatus.Commited) {
        return <LpLockingAssets />
    }
    return <UserCommitAction />
}

export const Actions: FC = () => {
    const { destinationDetails, sourceDetails, commitFromApi, destination_network, commitStatus } = useAtomicState()

    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)

    const allDone = ((sourceDetails?.hashlock && destinationDetails?.claimed == 3) || lpRedeemTransaction?.hash || sourceDetails?.claimed == 2) ? true : false
    const showTimer = !allDone && commitStatus !== CommitStatus.TimelockExpired
    const timelock = sourceDetails?.timelock || sourceDetails?.timelock

    return <ResolveAction />
}

const TransactionMessage: FC<{ isLoading: boolean, error: string | undefined }> = ({ error }) => {
    if (error === "An error occurred (USER_REFUSED_OP)" || error === "Execute failed" || error?.toLowerCase()?.includes('denied')) {
        return <TransactionMessages.TransactionRejectedMessage />
    }
    else if (error) {
        return <TransactionMessages.UexpectedErrorMessage message={error} />
    }
    else return <></>
}