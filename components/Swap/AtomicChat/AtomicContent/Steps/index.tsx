import { FC } from "react";
import { CancelAndRefund, LpLockingAssets, ManualClaim, RequestStep, SignAndConfirmStep, TimelockExpired } from "./Steps";

const Steps: FC = () => {
    return <div className="space-y-2">
        <RequestStep />
        <TimelockExpired />
        <CancelAndRefund />
        <LpLockingAssets />
        <SignAndConfirmStep />
        <ManualClaim />
    </div>
}

export default Steps;