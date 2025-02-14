import { FC } from "react";
import { UserCommitAction, UserLockAction, UserRefundAction } from "./Actions/UserActions";
import { CommitStatus, useAtomicState } from "../../../context/atomicContext";
import { LpLockingAssets } from "./Actions/LpLock";
import { RedeemAction } from "./Actions/Redeem";
import ActionStatus from "./Actions/Status/ActionStatus";
import SubmitButton from "../../buttons/submitButton";

export const ResolveAction: FC = () => {
    const { error, setError, commitStatus } = useAtomicState()

    if (error) {
        return <div className="w-full flex flex-col gap-4">
            <div className="flex w-full grow flex-col space-y-2" >
                <ActionStatus
                    status="error"
                    title={<p className="break-all">{error}</p>}
                />
            </div >
            <SubmitButton onClick={() => setError(undefined)}>
                Try again
            </SubmitButton>
        </div>
    }
    if (commitStatus === CommitStatus.RedeemCompleted) {
        return <></>
    }
    if (commitStatus === CommitStatus.TimelockExpired) {
        return <UserRefundAction />
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