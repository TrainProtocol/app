import { FC, useEffect, useMemo, useRef, useState } from "react"
import { useAtomicState } from "../../../../context/atomicContext"
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClaimStep, LpLockStep, RequestStep, SignAndConfirmStep } from "./Steps";
import { CommitFromApi, CommitTransaction } from "../../../../lib/layerSwapApiClient";
import { Commit } from "../../../../Models/PHTLC";
import { Network } from "../../../../Models/Network";
import { ResolveAction } from "../Resolver";
import { createPortal } from "react-dom";
import ReactPortal from "../../../Common/ReactPortal";

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

    const [openState, setOpenState] = React.useState("closed");

    const onClick = () => {
        if ((openState === "hover" || openState === 'closed') && cards.length > 1) setOpenState("opened");
    }
    const handleMouseEnter = () => {
        if (openState === "closed") setOpenState("hover");
    }

    const handleMouseLeave = () => {
        if (openState === "hover") setOpenState("closed");
    }

    const { commitFromApi, sourceDetails, destinationDetails, destination_network, userLocked } = useAtomicState()

    const cards = useMemo(() => {
        return resolveCards({ commitFromApi, sourceDetails, destinationDetails, destination_network, timelockExpired: false, userLocked })
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
        <div className='relative space-y-4 z-20'>
            <div
                ref={ref}
                onClick={onClick} className={`relative flex items-center justify-center`}>
                <ul onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} className="w-full h-[100px] mt-7 relative" >
                    {cards.sort((a, b) => b.id - a.id).map((card, index) => {
                        return (
                            <motion.li
                                key={card.id}
                                className={`absolute w-full rounded-componentRoundness origin-top list-none ${cards.length > 1 && (openState === 'opened' || (index + 1 < cards.length)) && 'drop-shadow-[0px_-3px_3px_rgba(0,0,0,0.3)]'}`}
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
            <ResolveAction />
        </div >

    );
};

const resolveCards = ({ commitFromApi, sourceDetails, destinationDetails, destination_network, timelockExpired, userLocked }: { commitFromApi: CommitFromApi | undefined, sourceDetails: Commit | undefined, destinationDetails: Commit | undefined, destination_network: Network | undefined, timelockExpired: boolean, userLocked: boolean }) => {
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
        cards.push({
            id: 1,
            component: LpLockStep,
        })
    }
    if (lpLockDetected) {
        cards.push({
            id: 2,
            component: SignAndConfirmStep,
        })
    }
    if (assetsLocked) {
        cards.push({
            id: 3,
            component: ClaimStep,
        })
    }

    return cards

}

export default AtomicSteps