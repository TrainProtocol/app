import { FC, ReactNode, useEffect } from "react";
import CheckedIcon from "../../../../Icons/CheckedIcon";
import Link from "next/link";
import { Link2 } from "lucide-react";
import TimelockTimer from "../../Timer";
import { usePulsatingCircles } from "../../../../../context/PulsatingCirclesContext";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../../../shadcn/tooltip";

type StepProps = {
    step: number;
    title: string;
    description: JSX.Element | string;
    active: boolean;
    titleDetails?: ReactNode;
    completed?: boolean
    loading?: boolean
    completedTxLink?: string;
    timelock?: number;
    isTimelocKExpired?: boolean;
}
const Step: FC<StepProps> = ({ step, title, description, active, completed, loading, completedTxLink, timelock, isTimelocKExpired, titleDetails }) => {
    const { setPulseState } = usePulsatingCircles();

    useEffect(() => {
        setPulseState(loading ? "pulsing" : "initial")
    }, [loading]);

    return <div className={`relative inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3 ${!active ? 'opacity-60' : ''}`}>
        <div className="space-y-1 w-full">
            <div className="inline-flex items-center justify-between w-full">
                <div className="inline-flex items-center gap-2">
                    <div className="flex w-fit items-center justify-center">
                        <div className="relative z-10 flex w-full items-center overflow-hidden rounded-full p-0.5">
                            {
                                loading &&
                                <div className="animate-rotate absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(theme(colors.accent.DEFAULT)_120deg,transparent_120deg)]" />
                            }
                            {
                                !completed &&
                                <div className={'py-0.5 px-2.5 bg-secondary-400 z-20 rounded-full relative text-[10px] transition-all inline-flex items-center gap-1'} >
                                    Step {step}
                                </div>
                            }
                            {
                                completed &&
                                <CheckedIcon className="h-5 w-5 text-accent" />
                            }
                        </div>
                    </div>
                    <div className="text-primary-text text-base leading-5">{title}</div>
                </div>
                {
                    titleDetails &&
                    <div className="text-primary-text-placeholder text-sm">
                        {titleDetails}
                    </div>
                }
            </div>
            <div className="text-sm text-primary-text-placeholder">{description}</div>
        </div>
        <div className="mr-2 flex items-center gap-1">
            {
                step === 1 && timelock && !isTimelocKExpired &&
                <TimelockTimer timelock={timelock}><span className="bg-secondary-500 hover:bg-secondary-600 rounded-full p-1 px-4 text-xs cursor-default">Refund</span></TimelockTimer>
            }
            {
                completedTxLink && completed &&
                <TxLink txLink={completedTxLink} />
            }
        </div>
    </div>
}

export const TxLink: FC<{ txLink: string }> = ({ txLink }) => {
    return <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
            <Link className="bg-secondary-500 hover:bg-secondary-600 rounded-full p-1 px-2 text-sm" target="_blank" href={txLink}>
                <Link2 className="h-4 w-auto" />
            </Link>
        </TooltipTrigger>
        <TooltipContent>
            View transaction
        </TooltipContent>
    </Tooltip>
}

export default Step;