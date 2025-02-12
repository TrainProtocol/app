import { FC, useEffect, useMemo, useRef } from "react"
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext"
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClaimStep, LpLockStep, RefundStep, RequestStep, SignAndConfirmStep, TimelockExpiredStep } from "./Steps";
import { CommitFromApi, CommitTransaction } from "../../../../lib/layerSwapApiClient";
import { Commit } from "../../../../Models/PHTLC";
import { Network } from "../../../../Models/Network";
import ReactPortal from "../../../Common/ReactPortal";
import useWindowDimensions from "../../../../hooks/useWindowDimensions";
import TimelockTimer from "../Timer";

const variations = {
    "closed": {
        CARD_OFFSET: 9,
        SCALE_FACTOR: 0.06,
    },
    "opened": {
        CARD_OFFSET: 110,
        SCALE_FACTOR: 0,
    },
    "hover": {
        CARD_OFFSET: 15,
        SCALE_FACTOR: 0.06,
    }
}

const AtomicSteps: FC = () => {

    const { isDesktop } = useWindowDimensions()
    const [openState, setOpenState] = React.useState("closed");

    const onClick = () => {
        if ((openState === "hover" || openState === 'closed') && cards.length > 1) setOpenState("opened");
        else setOpenState("closed");
    }
    const handleMouseEnter = () => {
        if (openState === "closed") setOpenState("hover");
    }

    const handleMouseLeave = () => {
        if (openState === "hover") setOpenState("closed");
    }

    const { commitFromApi, sourceDetails, destinationDetails, destination_network, userLocked, commitStatus } = useAtomicState()
    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)
    const allDone = ((sourceDetails?.hashlock && destinationDetails?.claimed == 3) || lpRedeemTransaction?.hash || sourceDetails?.claimed == 2) ? true : false
    const showTimer = sourceDetails && commitStatus !== CommitStatus.TimelockExpired && !allDone && openState == 'opened'

    const cards = useMemo(() => {
        return resolveCards({ commitFromApi, sourceDetails, destinationDetails, destination_network, commitStatus, userLocked })
    }, [commitFromApi, sourceDetails, destinationDetails, destination_network, userLocked])

    let ref = useRef(null);

    useEffect(() => {
        let handler = (e) => {
            if (ref.current && !((ref.current as any).contains(e.target))) {
                setOpenState('closed');
            }
        };

        document.addEventListener("mousedown", handler);

        return () => {
            document.removeEventListener("mousedown", handler);
        }

    }, [ref]);

    return (
        <div className='relative z-20'>
            <div
                ref={ref}
                onClick={onClick} className='relative flex items-center justify-center'
            >
                <ul
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        marginTop: isDesktop ? (openState === 'opened' ? `${cards.length > 3 && cards.length * 28}px` : (cards.length > 2 ? '28px' : '')) : '',
                        height: '100px'
                    }}
                    className='w-full relative transition-all'
                >
                    {cards.sort((a, b) => b.id - a.id).map((card, index) => {
                        return (
                            <motion.li
                                key={card.id}
                                className={`absolute w-full rounded-componentRoundness origin-top list-none ${cards.length > 1 && (index + 1 < cards.length && openState != 'opened') && 'drop-shadow-[0px_-3px_3px_rgba(0,0,0,0.3)]'}`}
                                initial={{
                                    y: '8vh'
                                }}
                                animate={{
                                    y: 0,
                                    top: index * -variations[openState].CARD_OFFSET,
                                    scale: 1 - index * variations[openState].SCALE_FACTOR,
                                    zIndex: cards.length - index,
                                }}
                            >
                                <card.component />
                            </motion.li>
                        );
                    })}
                    <AnimatePresence>
                        {
                            showTimer &&
                            <motion.div
                                className="absolute -bottom-8 left-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <TimelockTimer timelock={sourceDetails?.timelock} />
                            </motion.div>
                        }
                    </AnimatePresence>
                </ul>
            </div>
            <AnimatePresence>
                {
                    openState === 'opened' &&
                    <ReactPortal wrapperId="widget_root">
                        <motion.div
                            className={`absolute inset-0 z-10 bg-black/20 backdrop-blur-sm block`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                    </ReactPortal>
                }
            </AnimatePresence>
        </div >

    );
};

const resolveCards = ({ commitFromApi, sourceDetails, destinationDetails, destination_network, commitStatus, userLocked }: { commitFromApi: CommitFromApi | undefined, sourceDetails: Commit | undefined, destinationDetails: Commit | undefined, destination_network: Network | undefined, commitStatus: CommitStatus, userLocked: boolean }) => {

    const cards = [
        {
            id: 0,
            component: RequestStep,
        }
    ]

    const userLockTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)

    const commited = sourceDetails ? true : false;
    const lpLockDetected = destinationDetails?.hashlock ? true : false;
    const assetsLocked = ((sourceDetails?.hashlock && destinationDetails?.hashlock) || !!userLockTransaction) ? true : false;

    if (commited) {
        if (commitStatus === CommitStatus.TimelockExpired) {
            cards.push({
                id: 1,
                component: TimelockExpiredStep,
            })
        } else {
            cards.push({
                id: 1,
                component: LpLockStep,
            })
        }
    }
    if (lpLockDetected) {
        if (commitStatus === CommitStatus.TimelockExpired) {
            cards.push({
                id: 2,
                component: TimelockExpiredStep,
            })
        }
        else {
            cards.push({
                id: 2,
                component: SignAndConfirmStep,
            })
        }
    }
    if (assetsLocked) {
        cards.push({
            id: 3,
            component: ClaimStep,
        })
    }
    if (commitStatus === CommitStatus.TimelockExpired) {
        cards.push({
            id: 4,
            component: RefundStep,
        })
    }

    return cards

}

export default AtomicSteps