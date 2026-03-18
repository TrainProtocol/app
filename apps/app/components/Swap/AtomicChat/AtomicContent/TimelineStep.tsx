import { Check, X } from "lucide-react";
import clsx from "clsx";
import { Gauge } from "./Gauge";
import { StepStatus, TimelineStep as TimelineStepType } from "./progressTypes";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../../shadcn/tooltip";
import TimelockTimer from "../Timer";

function renderStepIcon(status: StepStatus) {
    switch (status) {
        case StepStatus.Complete:
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
                    <Check className="h-5 w-5 text-accent" aria-hidden="true" />
                </span>
            );

        case StepStatus.Current:
            return (
                <span className="animate-spin">
                    <Gauge value={40} size="verySmall" />
                </span>
            );

        case StepStatus.Failed:
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-accent/20">
                    <X className="h-5 w-5 text-accent" aria-hidden="true" />
                </span>
            );

        default:
            return (
                <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent/20">
                </span>
            );
    }
}

const TxLink = ({ txLink }: { txLink: string }) => {
    return (
        <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
                <Link className="bg-secondary-400 hover:bg-secondary-600 rounded-full p-1 px-2 text-sm" target="_blank" href={txLink}>
                    <Link2 className="h-4 w-4" />
                </Link>
            </TooltipTrigger>
            <TooltipContent>
                View transaction
            </TooltipContent>
        </Tooltip>
    );
};

function TimelineStep({ step, isLastStep }: { step: TimelineStepType, isLastStep: boolean }) {
    return (
        <li className={clsx(isLastStep ? '' : 'pb-5', 'relative')}>
            <div className="flex items-center justify-between w-full">
                {!isLastStep && (
                    <div className={clsx(`absolute top-1/2 left-4 -ml-px mt-2.5 h-[30%] w-0.5 `, {
                        "bg-accent/20": step.status !== StepStatus.Complete && step.status !== StepStatus.Failed,
                        "bg-accent": step.status === StepStatus.Complete || step.status === StepStatus.Failed
                    })}
                        aria-hidden="true" />
                )}
                <div className={clsx(`group relative flex `, {
                    "items-start": step?.description,
                    "items-center": !step?.description
                })}>
                    <span className="flex h-9 items-center text-primary-text" aria-hidden="true">
                        {renderStepIcon(step.status)}
                    </span>
                    <span className="ml-3 flex min-w-0 flex-col">
                        <span className={clsx(`text-sm font-medium`, {
                            "text-accent": step.status === StepStatus.Current,
                            "text-secondary-text/70": step.status === StepStatus.Upcoming,
                            "text-primary-text": step.status !== StepStatus.Current && step.status !== StepStatus.Upcoming
                        })}>
                            {step.name}
                        </span>
                        {
                            step?.description &&
                            <span className="text-sm text-secondary-text">{step?.description}</span>
                        }
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {step.timelock && <TimelockTimer timelock={step.timelock} />}
                    {step.txLink && (
                        <div className="flex justify-end">
                            <TxLink txLink={step.txLink} />
                        </div>
                    )}
                </div>
            </div>
        </li>
    );
}

export default TimelineStep;
