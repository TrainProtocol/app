import { FC } from "react";
import ResizablePanel from "../../../ResizablePanel";
import Steps from "./Steps";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import { motion } from "framer-motion";
import CheckedIcon from "../../../Icons/CheckedIcon";
import MotionSummary from "./Summary";
import { CircleAlert, ExternalLink } from "lucide-react";
import SpinIcon from "../../../Icons/spinIcon";
import ConnectedWallet from "./ConnectedWallet";
import Link from "next/link";
import { CommitTransaction } from "../../../../lib/layerSwapApiClient";

const AtomicContent: FC = () => {

    const { commitStatus, isManualClaimable, manualClaimRequested, commitFromApi, destination_network } = useAtomicState()
    const assetsLocked = commitStatus === CommitStatus.AssetsLocked || commitStatus === CommitStatus.RedeemCompleted
    const redeemTx = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)

    return (
        <>
            <ResizablePanel>
                <div className="w-full flex flex-col justify-between text-secondary-text">
                    <div className='grid grid-cols-1 gap-4'>
                        <ReleasingAssets
                            commitStatus={commitStatus}
                            isManualClaimable={isManualClaimable}
                            manualClaimRequested={manualClaimRequested}
                            redeemTxLink={redeemTx && destination_network?.transaction_explorer_template.replace('{0}', redeemTx?.hash)}
                        />
                        <motion.div
                            layout
                            transition={{ duration: 0.4 }}
                            style={{
                                bottom: assetsLocked ? '0px' : undefined,
                                top: assetsLocked ? undefined : '0px',
                            }}
                            className="z-20 absolute left-0 w-full"
                        >
                            <MotionSummary />
                        </motion.div>

                        {
                            assetsLocked &&
                            <div className="h-[220px]" />
                        }
                        <div
                            style={{
                                display: assetsLocked ? 'none' : 'block'
                            }}
                            className="transition-opacity">
                            <Steps />
                        </div>
                    </div>
                </div>
            </ResizablePanel >
            <ConnectedWallet />
        </>

    )
}

const ReleasingAssets: FC<{ commitStatus: CommitStatus, isManualClaimable: boolean | undefined, manualClaimRequested: boolean | undefined, redeemTxLink: string | undefined }> = ({ commitStatus, isManualClaimable, manualClaimRequested, redeemTxLink }) => {

    const ResolvedIcon = () => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return <CheckedIcon className="h-16 w-auto text-accent" />
        }
        if (isManualClaimable && !manualClaimRequested) {

            return <CircleAlert className="h-16 w-auto text-yellow-600" />
        }
        return <SpinIcon className="h-16 w-auto text-accent animate-reverse-spin" />
    }

    const ResolvedTitle = () => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return <p className="text-3xl text-primary-text">
                Transaction Completed Successfully
            </p>
        }
        if (isManualClaimable && !manualClaimRequested) {
            return <p className="text-xl text-primary-text">
                Release Failed
            </p>
        }
        return <p className="text-xl text-primary-text">
            Releasing assets
        </p>
    }

    const ResolvedDescription = () => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return redeemTxLink &&
                <div className="w-full flex justify-center">
                    <Link
                        href={redeemTxLink}
                        target='_blank'
                        className="p-1 px-4 rounded-full bg-secondary-700 flex gap-2 items-center text-primary-text-placeholder"
                    >
                        <p>
                            View transaction
                        </p>
                        <ExternalLink className="h-4 w-auto" />
                    </Link>
                </div>

        }
        if (isManualClaimable && !manualClaimRequested) {
            return <p className="text-base text-secondary-text max-w-sm mx-auto">
                The solver was unable to release your funds. Please claim them manually.
            </p>
        }
        return <p className="text-base text-secondary-text max-w-sm mx-auto">
            You will receive your assets at the destination address shortly.
        </p>
    }

    const show = commitStatus === CommitStatus.RedeemCompleted || commitStatus === CommitStatus.AssetsLocked

    return (
        <div
            style={{
                opacity: show ? 1 : 0,
                height: show ? 'auto' : '172px',
            }}
            className="flex flex-col gap-6 pt-10 pb-6 transition-all duration-500"
        >
            <ResolvedIcon />
            <div className="text-center space-y-2">
                <ResolvedTitle />
                <ResolvedDescription />
            </div>
        </div>
    )
}

export default AtomicContent;