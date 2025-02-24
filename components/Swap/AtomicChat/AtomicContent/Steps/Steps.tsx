import { FC } from "react";
import { CommitStatus, useAtomicState } from "../../../../../context/atomicContext";
import { CommitTransaction } from "../../../../../lib/layerSwapApiClient";
import LockIcon from "../../../../Icons/LockIcon";
import Link from "next/link";
import shortenAddress from "../../../../utils/ShortenAddress";
import Step from "./Step";
import { Clock } from "lucide-react";
import CheckedIcon from "../../../../Icons/CheckedIcon";
import XCircle from "../../../../Icons/CircleX";
import TimelockTimer from "../../Timer";

export const RequestStep: FC = () => {
    const { sourceDetails, commitId, commitTxId, source_network, commitFromApi } = useAtomicState()

    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)

    const commtting = (commitId && !sourceDetails) ? true : false;
    const commited = (sourceDetails || lpLockTx) ? true : false;

    const title = commited ? "Requested" : "Request"
    const description = (commitTxId && source_network) ? <p><span>Transaction ID:</span> <Link target="_blank" className="underline hover:no-underline" href={source_network?.transaction_explorer_template.replace('{0}', commitTxId)}>{shortenAddress(commitTxId)}</Link></p> : <>Confirm your intention to swap</>
    return <Step
        step={1}
        title={'Request'}
        description={description}
        active={true}
        completed={commited}
        loading={commtting && !commited}
    />

}

export const SignAndConfirmStep: FC = () => {
    const { sourceDetails, destinationDetails, source_network, destination_network, commitFromApi, commitStatus } = useAtomicState()

    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)
    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)
    const addLockSigTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)
    const commited = (sourceDetails || lpLockTx) ? true : false;

    const assetsLocked = !!(sourceDetails?.hashlock && destinationDetails?.hashlock) || commitStatus === CommitStatus.AssetsLocked || commitStatus === CommitStatus.RedeemCompleted;
    const loading = commitStatus === CommitStatus.UserLocked

    const title = assetsLocked ? "Signed & Confirmed" : "Sign & Confirm"
    const description = (assetsLocked)
        ? <div className="inline-flex gap-3">
            <div className="inline-flex gap-1 items-center">
                <p>Solver:</p> {(lpLockTx && destination_network) ? <Link className="underline hover:no-underline" target="_blank" href={destination_network?.transaction_explorer_template.replace('{0}', lpLockTx?.hash)}>{shortenAddress(lpLockTx.hash)}</Link> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />}
            </div>
            <div className="inline-flex gap-1 items-center">
                <p>You:</p> {(addLockSigTx && source_network) ? <Link className="underline hover:no-underline" target="_blank" href={source_network?.transaction_explorer_template.replace('{0}', addLockSigTx?.hash)}>{shortenAddress(addLockSigTx.hash)}</Link> : <div className="h-3 w-10 bg-gray-400 animate-pulse rounded" />}
            </div>
        </div>
        : <>Sign and finalize the swap, you can cancel and refund anytime before.</>

    const completed = !!(sourceDetails?.hashlock && destinationDetails?.hashlock) || !!lpRedeemTransaction?.hash || commitStatus === CommitStatus.RedeemCompleted || commitStatus === CommitStatus.AssetsLocked

    return (
        commitStatus !== CommitStatus.TimelockExpired &&
        <>
            {/* {
                <TimelockTimer timelock={sourceDetails?.timelock} >
                </TimelockTimer>
            } */}
            <Step
                step={2}
                title={title}
                description={'Sign and finalize the swap, you can cancel and refund anytime before.'}
                active={!!destinationDetails?.hashlock}
                completed={completed}
                loading={loading}
            />
        </>

    )
}


const SolverStatus: FC = () => {
    const { commitId, destinationDetails, commitFromApi } = useAtomicState()

    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)

    const commited = commitId ? true : false;
    const lpLockDetected = destinationDetails?.hashlock ? true : false;

    if (lpLockDetected) {
        if (destinationDetails?.fetchedByLightClient) {
            return <div className="flex items-center gap-1 text-sm">
                <p>
                    Transaction verified by
                </p>
                <div className="font-medium text-accent flex items-center gap-1">
                    <p>Light Client</p>
                    <LockIcon className="h-4 w-4 text-accent" />
                </div>
            </div>
        }

        return <p className="text-sm text-primary-text-placeholder">
            Transaction verified by rpcs
        </p>
    }

    return <div className="text-sm text-primary-text-placeholder">Assets are prepared for you in the destination chain</div>
}


export const LpLockingAssets: FC = () => {
    const { destinationDetails, commitStatus, sourceDetails } = useAtomicState()
    const completed = destinationDetails?.hashlock ? true : false;
    const loading = sourceDetails && !destinationDetails?.hashlock

    return (
        commitStatus !== CommitStatus.TimelockExpired &&
        <div className={`inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3 ${!sourceDetails ? 'opacity-60' : ''}`}>
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2">
                    {
                        completed &&
                        <CheckedIcon className="h-5 w-5 text-accent" />
                    }
                    {
                        !loading && !completed &&
                        <Clock className="w-5 h-5 text-secondary-text" />
                    }
                    {
                        loading &&
                        <div className="flex justify-center">
                            <div className="relative flex items-center justify-end w-5 h-5 overflow-hidden border-2 border-accent rounded-full ">
                                <div className="absolute w-1/2 h-0.5  origin-left animate-spin-fast">
                                    <div className="w-3/4 h-full bg-accent rounded-full" />
                                </div>

                                <div className="absolute w-1/2 h-0.5  origin-left  animate-spin-slow">
                                    <div className="w-2/3 h-full bg-accent rounded-full" />
                                </div>
                                <div className="absolute flex justify-center flex-1 w-full">
                                    <div className="w-0.5 h-0.5 bg-accent rounded-full" />
                                </div>
                            </div>
                        </div>
                    }
                    <div className="text-primary-text text-base leading-5">Locking Assets</div>
                </div>
                <SolverStatus />
            </div>
        </div>
    )
}


export const TimelockExpired: FC = () => {
    const { commitStatus } = useAtomicState()

    const title = "Timelock Expired"
    const description = 'Assets are prepared for you in the destination chain'

    return (
        commitStatus === CommitStatus.TimelockExpired &&
        <div className='inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3'>
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    <div className="text-primary-text text-base leading-5">{title}</div>
                </div>
                <div className="text-sm text-primary-text-placeholder">{description}</div>
            </div>
        </div>
    )
}

export const CancelAndRefund: FC = () => {
    const { commitStatus, refundTxId } = useAtomicState()

    const resolvedTitle = refundTxId ? 'Refund Completed' : 'Refund'

    return (
        commitStatus === CommitStatus.TimelockExpired &&
        <div className='inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3'>
            <div className="space-y-2">
                <div className="inline-flex items-center gap-2">
                    {
                        refundTxId &&
                        <CheckedIcon className="h-5 w-5 text-accent" />
                    }
                    <div className="text-primary-text text-base leading-5">{resolvedTitle}</div>
                </div>
                <div className="text-sm text-primary-text-placeholder">short description of what happened and what will follow.</div>
            </div>
        </div>
    )
}