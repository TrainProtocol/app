import { FC } from "react";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import { CommitTransaction } from "../../../../lib/layerSwapApiClient";
import { Link } from "lucide-react";
import SubmitButton from "../../../buttons/submitButton";
import shortenAddress from "../../../utils/ShortenAddress";
import { LpLockingAssets } from "./LpLock";
import { RedeemAction } from "./Redeem";
import ActionStatus from "./Status/ActionStatus";
import { UserRefundAction, UserLockAction, UserCommitAction } from "./UserActions";

const ResolveAction: FC = () => {
    const { sourceDetails, destination_network, error, updateCommit, commitStatus, commitFromApi, refundTxId, source_network } = useAtomicState()
    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)

    //TODO: remove lp actions just disable the button
    if (error) {
        return <div className="w-full flex flex-col gap-4">
            <div className="flex w-full grow flex-col space-y-2" >
                <ActionStatus
                    status="error"
                    title={<p className="break-all">{error}</p>}
                />
            </div >
            <SubmitButton onClick={() => updateCommit('error', undefined)}>
                Try again
            </SubmitButton>
        </div>
    }
    if (commitStatus === CommitStatus.RedeemCompleted) {
        return <></>
        // <ActionStatus
        //     status="success"
        //     title={
        //         <div className="flex flex-col space-y-0">
        //             <p className="text-base leading-5 font-medium">Transaction Completed</p>
        //             <div className="inline-flex gap-1 items-center text-sm">
        //                 <p>ID:</p> {(lpRedeemTransaction && destination_network) ? <Link className="underline hover:no-underline" target="_blank" href={destination_network?.transaction_explorer_template.replace('{0}', lpRedeemTransaction.hash)}>{shortenAddress(lpRedeemTransaction?.hash)}</Link> : <div className="h-3 w-14 bg-gray-400 animate-pulse rounded" />}
        //             </div>
        //         </div>
        //     }
        // />
    }
    if (commitStatus === CommitStatus.TimelockExpired) {
        if (sourceDetails?.claimed == 2) {
            return <></>
            // <ActionStatus
            //     status="success"
            //     title={
            //         <div className="flex flex-col space-y-0">
            //             <p className="text-base leading-5 font-medium">Refund Completed</p>
            //             <div className="inline-flex gap-1 items-center text-sm">
            //                 <p>ID:</p> {(refundTxId && source_network) ? <Link className="underline hover:no-underline" target="_blank" href={source_network?.transaction_explorer_template.replace('{0}', refundTxId)}>{shortenAddress(refundTxId)}</Link> : <div className="h-3 w-14 bg-gray-400 animate-pulse rounded" />}
            //             </div>
            //         </div>
            //     }
            // />
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