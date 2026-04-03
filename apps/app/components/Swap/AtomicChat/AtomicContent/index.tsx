import { FC } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import Summary from "./Summary";
import type { SwapQuote } from "@train-protocol/react";
import SwapQuoteComp from "@/components/FeeDetails/SwapQuote";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { Gauge } from "./Gauge";
import Timeline from "./Timeline";
import { useSwapProgress } from "./useSwapProgress";
import { CircleCheck, SearchX, Undo2, X } from "lucide-react";
import { HTLCStatus } from "@train-protocol/react";
import { Loader2 } from "lucide-react";
import { useFormikContext } from "formik";
import { useSettingsState } from "@/context/settings";

type AtomicContentProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const AtomicContent: FC<AtomicContentProps> = ({ quote, isQuoteLoading = false }) => {
    const swap = useActiveSwap()
    const { values } = useFormikContext<SwapFormValues>()
    const { networks } = useSettingsState()

    // Post-lock: use derived state. Pre-lock: use Formik values.
    const source_network = swap.sourceNetwork ? networks.find(n => n.caip2Id == swap.sourceNetwork?.caip2Id) : values?.from
    const destination_network = swap.destinationNetwork ? networks.find(n => n.caip2Id == swap.destinationNetwork?.caip2Id) : values?.to
    const source_asset = swap.sourceToken ? source_network?.tokens.find(t => t.contract == swap.sourceToken?.contract) : values?.fromCurrency
    const destination_asset = swap.destinationToken ? destination_network?.tokens.find(t => t.contract == swap.destinationToken?.contract) : values?.toCurrency
    const amount = swap.requestedAmount ? Number(swap.requestedAmount) : (values?.amount ? Number(values.amount) : undefined)
    const hashlock = swap.hashlock

    const { status: commitStatus } = swap
    const isInitial = commitStatus === HTLCStatus.Initial

    const formValues: SwapFormValues = {
        amount: amount?.toString(),
        from: source_network,
        to: destination_network,
        fromCurrency: source_asset,
        toCurrency: destination_asset,
    }

    if (swap.isLoading) return <SwapLoading />;
    if (!source_network || !destination_network || !source_asset || !destination_asset) return <SwapNotFound />;

    return (
        <>
            <Summary
                sourceNetwork={source_network}
                destinationNetwork={destination_network}
                sourceToken={source_asset}
                destinationToken={destination_asset}
                requestedAmount={amount}
                receiveAmount={swap.receiveAmount}
                htlcFromApi={swap.htlcFromApi}
                quote={quote}
            />

            {isInitial && !hashlock && (
                <SwapQuoteComp values={formValues} quote={quote} isQuoteLoading={isQuoteLoading} />
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

const SwapLoading: FC = () => (
    <div className="flex flex-col items-center justify-center gap-2 w-full min-h-[450px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <span className="text-sm text-secondary-text">Loading swap data...</span>
    </div>
);

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
