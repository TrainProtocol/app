import { FC, useEffect } from "react";
import { useAtomicState } from "@/context/atomicContext";
import Summary from "./Summary";

import { SwapQuote } from "@/lib/trainApiClient";
import SwapQuoteComp from "@/components/FeeDetails/SwapQuote";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Gauge } from "./Gauge";
import Timeline from "./Timeline";
import { useSwapProgress } from "./useSwapProgress";
import { CircleCheck, SearchX, Undo2, X } from "lucide-react";
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

    const isInitial = commitStatus === HTLCStatus.Initial

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

    if(!source_network || !destination_network || !source_asset || !destination_asset) return <SwapNotFound />;
    
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
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                <X className="h-7 w-7 text-primary" aria-hidden="true" />
                            </span>
                        ) : gaugeIcon === "undo" ? (
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                                <Undo2 className="h-7 w-7 text-primary" aria-hidden="true" />
                            </span>
                        ) : gaugeIcon === "circleCheck" ? (
                            <span className="relative z-10 flex h-10 w-10 items-center justify-center">
                                <CircleCheck className="h-10 w-10 text-primary" strokeWidth={2} aria-hidden="true" />
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

const SwapNotFound: FC = () => (
    <div className="flex flex-col items-center justify-center gap-2 w-full min-h-[450px]">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <SearchX className="h-10 w-10 text-primary" aria-hidden="true" />
        </span>
        <span className="font-medium text-primary-text text-xl">Swap not found</span>
        <span className="text-sm text-secondary-text text-center">
            The swap data could not be loaded.
        </span>
    </div>
);

export default AtomicContent;
