import { FC, useEffect, useMemo, useState } from "react";
import ResizablePanel from "../../../ResizablePanel";
import Steps from "./Steps";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import { motion } from "framer-motion";
import CheckedIcon from "../../../Icons/CheckedIcon";
import MotionSummary from "./Summary";
import { CircleAlert, ExternalLink, Loader2 } from "lucide-react";
import ConnectedWallet from "./ConnectedWallet";
import Link from "next/link";
import { usePulsatingCircles } from "../../../../context/PulsatingCirclesContext";
import { useRive } from "@rive-app/react-canvas";
import SpinIcon from "../../../Icons/spinIcon";

const AtomicContent: FC = () => {

    const { commitStatus, isManualClaimable, manualClaimRequested, destination_network, destRedeemTx, destinationDetails } = useAtomicState()
    const assetsLocked = commitStatus === CommitStatus.AssetsLocked || commitStatus === CommitStatus.RedeemCompleted

    const { setPulseState } = usePulsatingCircles();

    useEffect(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            setPulseState("completed");
        }
        else if (isManualClaimable && !manualClaimRequested) {
            setPulseState("initial");
        }
        else if (assetsLocked || (manualClaimRequested && destinationDetails?.claimed !== 3)) {
            setPulseState("pulsing");
        }
    }, [assetsLocked, commitStatus, isManualClaimable, manualClaimRequested, destinationDetails?.claimed]);

    return (
        <>
            <ResizablePanel>
                <div className="w-full flex flex-col justify-between text-secondary-text">
                    <div className='grid grid-cols-1 gap-4'>
                        <ReleasingAssets
                            commitStatus={commitStatus}
                            isManualClaimable={isManualClaimable}
                            manualClaimRequested={manualClaimRequested}
                            redeemTxLink={destRedeemTx && destination_network?.transactionExplorerTemplate.replace('{0}', destRedeemTx)}
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

    const ResolvedIcon = useMemo(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return <CheckedIcon className="h-16 w-auto text-accent" />
        }
        if (isManualClaimable && !manualClaimRequested) {

            return <CircleAlert className="h-16 w-auto text-yellow-600" />
        }
        return <RiveComponent />

    }, [commitStatus, isManualClaimable, manualClaimRequested])

    const ResolvedTitle = useMemo(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return <p className="text-3xl text-primary-text">
                Swap Completed
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
    }, [commitStatus, isManualClaimable, manualClaimRequested])

    const ResolvedDescription = useMemo(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return redeemTxLink ?
                <div className="w-full flex justify-center">
                    <Link
                        href={redeemTxLink}
                        target='_blank'
                        className="p-1 px-4 rounded-full bg-secondary-700 flex gap-2 items-center text-secondary-text"
                    >
                        <p>
                            View transaction
                        </p>
                        <ExternalLink className="h-4 w-auto" />
                    </Link>
                </div>
                :
                <div className="w-full flex justify-center opacity-75">
                    <div
                        className="p-1 px-4 rounded-full bg-secondary-700 flex gap-2 items-center text-secondary-text"
                    >
                        <p>
                            View transaction
                        </p>
                        <SpinIcon className="h-4 w-auto animate-reverse-spin" />
                    </div>
                </div>

        }
        if (isManualClaimable && !manualClaimRequested) {
            return <p className="text-base text-secondary-text max-w-xs mx-auto">
                The solver was unable to release your funds. Please claim them manually.
            </p>
        }
        return <p className="text-base text-secondary-text max-w-xs mx-auto">
            You will receive your assets at the destination address shortly.
        </p>
    }, [commitStatus, isManualClaimable, manualClaimRequested, redeemTxLink])

    const show = commitStatus === CommitStatus.RedeemCompleted || commitStatus === CommitStatus.AssetsLocked

    return (
        <div
            style={{
                opacity: show ? 1 : 0,
                height: show ? 'auto' : '172px',
            }}
            className="flex flex-col gap-6 pt-10 pb-6 transition-all duration-500"
        >
            {ResolvedIcon}
            <div className="text-center space-y-2">
                {ResolvedTitle}
                {ResolvedDescription}
            </div>
        </div>
    )
}

export default AtomicContent;

const RiveComponent = () => {
    const { pulseState } = usePulsatingCircles();

    const { RiveComponent: RiveAnimation, rive } = useRive({
        src: "/finalload.riv",
        stateMachines: "State Machine 1",
        autoplay: true,
    });

    useEffect(() => {
        if (rive) {
            const inputs = rive.stateMachineInputs("State Machine 1");
            if (inputs && inputs.length > 0) {
                const input = inputs[0];

                if (pulseState === "pulsing") {
                    input.value = 0;
                } else if (pulseState === "completed") {
                    input.value = 2;
                }
            }
        }
    }, [pulseState, rive]);

    return (
        <div className="h-[136px] w-[136px] m-auto">
            <RiveAnimation />
        </div>
    );
};
