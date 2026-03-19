import { FC, useEffect } from "react";
import { useAtomicState } from "@/context/atomicContext";
import Summary from "./Summary";
import { usePulsatingCircles } from "@/stores/pulsatingCirclesStore";
import { SwapQuote } from "@/lib/trainApiClient";
import SwapQuoteComp from "@/components/FeeDetails/SwapQuote";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Gauge } from "./Gauge";
import Timeline from "./Timeline";
import { useSwapProgress } from "./useSwapProgress";
import { CircleCheck, Undo2, X } from "lucide-react";
import { HTLCStatus } from "@/Models/HTLCStatus";

type AtomicContentProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const AtomicContent: FC<AtomicContentProps> = ({ quote, isQuoteLoading = false }) => {
    const {
        htlcStatus: commitStatus, destination_network, source_network,
        source_asset, destination_asset, amount,
        solverLockDetails, destinationDetailsByLightClient, setError,
        hashlock,
    } = useAtomicState()

    const { setPulseState } = usePulsatingCircles();

    const isInitial = commitStatus === HTLCStatus.Initial

    // Centralized pulse state
    useEffect(() => {
        switch (commitStatus) {
            case HTLCStatus.RedeemCompleted:
                setPulseState("completed");
                break;
            case HTLCStatus.SecretRevealed:
            case HTLCStatus.UserLocked:
                setPulseState("pulsing");
                break;
            default:
                setPulseState("initial");
        }
    }, [commitStatus]);

    // Hashlock mismatch safety check (preserved from old LpLockingAssets step)
    useEffect(() => {
        const lcHash = destinationDetailsByLightClient?.data?.hashlock
        const solverHash = solverLockDetails?.hashlock
        if (lcHash && solverHash && lcHash !== solverHash) {
            setError({ message: 'Hashlock mismatch, please wait for refund.', disableButton: true })
        }
    }, [solverLockDetails, destinationDetailsByLightClient]);

    const values: SwapFormValues = {
        amount: amount?.toString(),
        from: source_network,
        to: destination_network,
        fromCurrency: source_asset,
        toCurrency: destination_asset,
    }

    return (
        <>
            <Summary quote={quote} isQuoteLoading={isQuoteLoading} />

            {isInitial && !hashlock && (
                <SwapQuoteComp values={values} quote={quote} isQuoteLoading={isQuoteLoading} />
            )}

            {(!isInitial || hashlock) && <SwapProgressPanel />}
        </>
    )
}

// New gauge + timeline progress panel
const SwapProgressPanel: FC = () => {
    const { gaugeValue, gaugeIcon, title, subtitle, steps } = useSwapProgress();

    return (
        <div className="bg-secondary-500 font-normal px-3 pt-6 pb-3 rounded-2xl space-y-4 flex flex-col w-full relative z-10 divide-y-2 divide-secondary-300 divide-dashed">
            {/* Gauge + status title section */}
            <div className="pb-4">
                <div className="flex flex-col gap-2 items-center">
                    <div className="flex items-center">
                        {gaugeIcon === "x" ? (
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                                <X className="h-7 w-7 text-accent" aria-hidden="true" />
                            </span>
                        ) : gaugeIcon === "undo" ? (
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                                <Undo2 className="h-7 w-7 text-accent" aria-hidden="true" />
                            </span>
                        ) : gaugeIcon === "circleCheck" ? (
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center">
                                <CircleCheck className="h-10 w-10 text-accent" strokeWidth={2} aria-hidden="true" />
                            </span>
                        ) : (
                            <Gauge value={gaugeValue} size="small" showCheckmark={gaugeIcon === "check"} />
                        )}
                    </div>
                    <div className="flex-col text-center">
                        <span className="font-medium text-primary-text">{title}</span>
                        {subtitle && (
                            <span className="text-sm block text-secondary-text">{subtitle}</span>
                        )}
                    </div>
                </div>
            </div>
            {/* Timeline section */}
            {steps.length > 0 && (
                <div className="flex flex-col justify-center space-y-4">
                    <Timeline steps={steps} />
                </div>
            )}
        </div>
    );
};

export default AtomicContent;
