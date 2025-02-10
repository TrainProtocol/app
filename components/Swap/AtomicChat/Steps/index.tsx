import { FC, useMemo } from "react"
import { useAtomicState } from "../../../../context/atomicContext"
import React from "react";
import { motion } from "framer-motion";
import { ClaimStep, LpLockStep, RequestStep, SignAndConfirmStep } from "./Steps";
import { CommitFromApi, CommitTransaction } from "../../../../lib/layerSwapApiClient";
import { Commit } from "../../../../Models/PHTLC";
import { Network } from "../../../../Models/Network";

const variations = {
    "closed": {
        CARD_OFFSET: 10,
        SCALE_FACTOR: 0.06,
    }
    ,
    "opened": {
        CARD_OFFSET: 110,
        SCALE_FACTOR: 0,
    }
}

const AtomicSteps: FC = () => {

    const [openState, setOpenState] = React.useState("closed");

    const onClick = () => {
        // setOpenState(openState === "closed" ? "opened" : "closed");
        // setCards([{ id: cards.length, component: RequestStep }, ...cards])
    }

    const { commitFromApi, sourceDetails, destinationDetails, destination_network, userLocked } = useAtomicState()

    const cards = useMemo(() => {
        return resolveCards({ commitFromApi, sourceDetails, destinationDetails, destination_network, timelockExpired: false, userLocked })
    }, [commitFromApi, sourceDetails, destinationDetails, destination_network, userLocked])

    return (
        <div onClick={onClick} className="relative flex items-center justify-center z-50">
            <ul className="w-full h-[100px] mt-12 relative" >
                {cards.sort((a, b) => b.id - a.id).map((card, index) => {
                    return (
                        <motion.li
                            key={card.id}
                            className={`absolute w-full h-fit rounded-componentRoundness origin-top list-none ${cards.length > 1 && 'drop-shadow-[0px_0px_5px_rgba(0,0,0,0.5)] px-2'}`}
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
    );
};

const resolveCards = ({ commitFromApi, sourceDetails, destinationDetails, destination_network, timelockExpired, userLocked }: { commitFromApi: CommitFromApi | undefined, sourceDetails: Commit | undefined, destinationDetails: Commit | undefined, destination_network: Network | undefined, timelockExpired: boolean, userLocked: boolean }) => {
    const cards = [
        {
            id: 0,
            component: RequestStep,
        }
    ]

    const lpRedeemTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCRedeem && t.network === destination_network?.name)
    const userLockTransaction = commitFromApi?.transactions.find(t => t.type === CommitTransaction.HTLCAddLockSig)

    const commited = sourceDetails ? true : false;
    const lpLockDetected = destinationDetails?.hashlock ? true : false;
    const assetsLocked = ((sourceDetails?.hashlock && destinationDetails?.hashlock) || !!userLockTransaction) ? true : false;
    const redeemCompleted = (destinationDetails?.claimed == 3 ? true : false) || lpRedeemTransaction?.hash;

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