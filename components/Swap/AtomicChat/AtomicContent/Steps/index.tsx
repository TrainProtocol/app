import { FC } from "react";
import { LpLockingAssets, RequestStep, SignAndConfirmStep } from "./Steps";

const Steps: FC = () => {
    return <div className="space-y-2">
        <RequestStep />
        <LpLockingAssets />
        <SignAndConfirmStep />
    </div>
}

export default Steps;