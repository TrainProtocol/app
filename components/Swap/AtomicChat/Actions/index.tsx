import { FC } from "react";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import { LpLockingAssets } from "./LpLock";
import { RedeemAction } from "./Redeem";
import { UserRefundAction, UserLockAction, UserCommitAction } from "./UserActions";
import TransactionMessages from "../../messages/TransactionMessages";
import { Commit } from "../../../../Models/PHTLC";
import { AnimatePresence, motion } from "framer-motion";
import ReactPortal from "../../../Common/ReactPortal";
import ButtonStatus from "./Status/ButtonStatus";

const ResolveAction: FC<{ sourceDetails: Commit | undefined, commitStatus: CommitStatus, error: string | undefined }> = ({ commitStatus, sourceDetails, error }) => {

    if (error) {
        return <ButtonStatus>
            Error
        </ButtonStatus>
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
    const { sourceDetails, commitStatus, error } = useAtomicState()

    return (
        <div className="relative">
            <Error />
            <ResolveAction
                commitStatus={commitStatus}
                sourceDetails={sourceDetails}
                error={error}
            />
        </div>
    )
}

const Error: FC = () => {
    const { error, updateCommit } = useAtomicState()

    return <>
        <AnimatePresence>
            {
                error &&
                <>
                    <motion.div
                        initial={{ y: 150 }}
                        animate={{ y: 0 }}
                        exit={{ y: 150 }}
                        transition={{ duration: 0.15, bounceDamping: 0 }}
                        className="absolute z-30 bottom-0 bg-secondary-700 rounded-2xl p-3 w-full shadow-card"
                    >
                        <div className="w-full space-y-3 flex flex-col justify-between h-full text-secondary-text">
                            <TransactionMessage error={error} isLoading={false} />
                            <button
                                type="button"
                                onClick={() => updateCommit('error', undefined)}
                                className='relative w-full font-semibold rounded-componentRoundness transition duration-200 ease-in-out bg-secondary-400 border border-secondary-500 text-primary-text py-3 px-2 md:px-3'
                            >
                                Try again
                            </button>
                        </div>
                    </motion.div>
                    {/* <ReactPortal wrapperId="widget">
                        <motion.div
                            className={`absolute inset-0 z-20 bg-black/50 block`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => updateCommit('error', undefined)}
                        />
                    </ReactPortal> */}
                </>

            }
        </AnimatePresence>
    </>
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