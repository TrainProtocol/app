import { FC } from "react";
import { LpLockingAssets, RequestStep, SignAndConfirmStep } from "./Steps";

const ResolveMessages: FC = () => {
    return <div className="space-y-2">
        <RequestStep />
        <LpLockingAssets />
        <SignAndConfirmStep />
    </div>
}

export default ResolveMessages;