import { FC } from "react";
import { CancelAndRefund, LpLockingAssets, RequestStep, SignAndConfirmStep, TimelockExpired } from "./Steps";

const Steps: FC = () => {
    return <div className="space-y-2">
        <RequestStep />
        <TimelockExpired />
        <CancelAndRefund />
        <LpLockingAssets />
        <SignAndConfirmStep />
    </div>
}

export default Steps;