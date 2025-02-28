import { FC, useEffect } from "react";
import { CommitStatus, useAtomicState } from "../../../../../context/atomicContext";
import { CommitTransaction } from "../../../../../lib/layerSwapApiClient";
import LockIcon from "../../../../Icons/LockIcon";
import Link from "next/link";
import Step from "./Step";
import { Clock, Link2 } from "lucide-react";
import CheckedIcon from "../../../../Icons/CheckedIcon";
import XCircle from "../../../../Icons/CircleX";
import TimelockTimer from "../../Timer";
import { usePulsatingCircles } from "../../../../../context/PulsatingCirclesContext";

export const RequestStep: FC = () => {
    const { sourceDetails, commitId, commitTxId, source_network, commitFromApi, isTimelockExpired } = useAtomicState()

    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)

    const commtting = (commitId && !sourceDetails) ? true : false;
    const commited = (sourceDetails || lpLockTx) ? true : false;

    const title = commited ? "Confirmed" : "Confirm the details"
    const description = (commited && source_network) ? <>Swap details confirmed</> : <>Review and confirm the swap details</>

    const completedTxLink = source_network && commitTxId && source_network?.transaction_explorer_template.replace('{0}', commitTxId)

    return <Step
        step={1}
        title={title}
        description={description}
        active={true}
        completed={commited}
        loading={commtting && !commited}
        completedTxLink={completedTxLink}
        timelock={sourceDetails?.timelock}
        isTimelocKExpired={isTimelockExpired}
    />

}

export const SignAndConfirmStep: FC = () => {
    const { sourceDetails, destinationDetails, destination_network, commitFromApi, commitStatus } = useAtomicState()

    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)
    const assetsLocked = !!(sourceDetails?.hashlock && destinationDetails?.hashlock) || commitStatus === CommitStatus.AssetsLocked || commitStatus === CommitStatus.RedeemCompleted;
    const loading = commitStatus === CommitStatus.UserLocked

    const title = assetsLocked ? "Finalized" : "Finalize"
    const completed = !!(sourceDetails?.hashlock && destinationDetails?.hashlock) || !!lpRedeemTransaction?.hash || commitStatus === CommitStatus.RedeemCompleted || commitStatus === CommitStatus.AssetsLocked

    const description = assetsLocked
        ? <span>
            You will receive your assets at the destination address shortly.
        </span>
        : <span>
            Sign and finalize the swap, you can cancel and refund anytime before.
        </span>

    return (
        commitStatus !== CommitStatus.TimelockExpired &&
        <Step
            step={2}
            title={title}
            description={description}
            active={!!destinationDetails?.hashlock}
            completed={completed}
            loading={loading}
        />

    )
}


const SolverStatus: FC = () => {
    const { destinationDetails } = useAtomicState()
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
            Transaction verified by RPCs
        </p>
    }

    return <div className="text-sm text-primary-text-placeholder">Wait for the assets to be reserved for you at the destination</div>
}


export const LpLockingAssets: FC = () => {
    const { destinationDetails, commitStatus, sourceDetails, commitFromApi, destination_network } = useAtomicState()
    const completed = destinationDetails?.hashlock ? true : false;
    const loading = sourceDetails && !destinationDetails?.hashlock
    const lpLockTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCLock)

    const title = completed ? 'Assets reserved' : 'Wait for response'

    const { setPulseState } = usePulsatingCircles();

    useEffect(() => {
        setPulseState(loading ? "pulsing" : "initial");
    }, [loading, setPulseState]);

    return (
        commitStatus !== CommitStatus.TimelockExpired &&
        <>
            <div className={`relative inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3 ${!sourceDetails ? 'opacity-60' : ''}`}>
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2">
                        <div className="flex w-fit items-center justify-center">
                            <div
                                className="z-10 flex w-full items-center overflow-hidden rounded-full p-0.5"
                            >
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
                                        <div className="relative flex items-center justify-end w-[18px] h-[18px] overflow-hidden border-2 border-accent rounded-full ">
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
                            </div>
                        </div>
                        <div className="text-primary-text text-base leading-5">{title}</div>
                    </div>
                    <SolverStatus />
                </div>
                {
                    lpLockTx && destination_network && destinationDetails?.hashlock &&
                    <Link className="mr-2 flex items-center gap-1 bg-secondary-500 hover:bg-secondary-600 rounded-full p-1 px-2 text-sm" target="_blank" href={destination_network?.transaction_explorer_template.replace('{0}', lpLockTx?.hash)}>
                        <Link2 className="h-4 w-auto" />
                    </Link>
                }
            </div>
        </>
    )
}


export const TimelockExpired: FC = () => {
    const { commitStatus } = useAtomicState()

    const title = "Timelock Expired"
    const description = 'The response was not received in time'

    return (
        commitStatus === CommitStatus.TimelockExpired &&
        <div className='inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3'>
            <div className="space-y-1">
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
    const { commitStatus, refundTxId, source_network, sourceDetails } = useAtomicState()

    const completed = sourceDetails?.claimed == 2
    const loading = refundTxId && !completed
    const resolvedDescription = completed ? 'Assets are received back at the source address' : 'Cancel & refund to receive your assets back at the source address'

    return (
        commitStatus === CommitStatus.TimelockExpired &&
        <div className={`inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3 relative`}>
            <div className="space-y-1">
                <div className="inline-flex items-center gap-2">
                    <div className="flex w-fit items-center justify-center">
                        <div
                            className="relative z-0 flex w-full items-center overflow-hidden rounded-full p-0.5"
                        >
                            {
                                loading &&
                                <div className="animate-rotate absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(theme(colors.accent.DEFAULT)_120deg,transparent_120deg)]" />
                            }
                            {
                                !completed &&
                                <div className='py-0.5 px-2.5 bg-secondary-400 z-20 rounded-full relative text-sm transition-all inline-flex items-center gap-1' >
                                    Refund
                                </div>
                            }
                            {
                                completed &&
                                <CheckedIcon className="h-5 w-5 text-accent" />
                            }
                        </div>
                    </div>
                    {
                        completed &&
                        <div className="text-primary-text text-base leading-5">Refund Completed</div>
                    }
                </div>
                <div className="text-sm text-primary-text-placeholder">{resolvedDescription}</div>
            </div>
            {
                refundTxId && source_network && completed &&
                <div className="absolute right-5 top-[calc(50%-14px)] flex items-center gap-2 bg-secondary-500 hover:bg-secondary-600 rounded-full p-1 px-2 text-sm">
                    <Link className="flex items-center gap-1" target="_blank" href={source_network?.transaction_explorer_template.replace('{0}', refundTxId)}>
                        <Link2 className="h-4 w-auto" />
                    </Link>
                </div>
            }
        </div>

    )
}