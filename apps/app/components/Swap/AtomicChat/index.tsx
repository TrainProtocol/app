import { FC, useMemo } from "react";
import { Widget } from "../../Widget/Index";
import { Actions, SwapViewType } from "./Actions";
import AtomicContent from "./AtomicContent";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import type { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { buildQuoteParamsFromAtomic, useQuoteData } from "../../../hooks/useFee";

type ContainerProps = {
    type: SwapViewType,
    formValues?: SwapFormValues,
}

const Swap: FC<ContainerProps> = ({ type, formValues }) => {
    const swap = useActiveSwap()

    // Post-lock: use derived state. Pre-lock: use form values from caller.
    const sourceNetwork = swap.sourceNetwork ?? formValues?.from
    const destinationNetwork = swap.destinationNetwork ?? formValues?.to
    const sourceAsset = swap.sourceToken ?? formValues?.fromCurrency
    const destinationAsset = swap.destinationToken ?? formValues?.toCurrency
    const hashlock = swap.hashlock

    const quoteParams = useMemo(() => {
        if (hashlock) return undefined;
        return buildQuoteParamsFromAtomic({
            from: sourceNetwork?.caip2Id,
            to: destinationNetwork?.caip2Id,
            fromCurrency: sourceAsset,
            toCurrency: destinationAsset,
            amount: formValues?.amount,
            receiveAmount: formValues?.receiveAmount,
        });
    }, [hashlock, sourceNetwork?.caip2Id, destinationNetwork?.caip2Id, sourceAsset, destinationAsset, formValues?.amount, formValues?.receiveAmount]);

    const { quote, solverId, isQuoteLoading } = useQuoteData(quoteParams, 42000);

    return (
        <>
            <Widget.Content>
                <AtomicContent quote={quote} isQuoteLoading={isQuoteLoading} formValues={formValues} />
            </Widget.Content>
            <Actions quote={quote} solverId={solverId} type={type} formValues={formValues} />
        </>
    )
}

const Container: FC<ContainerProps> = (props) => {
    const { type } = props

    if (type === "widget")
        return <Widget className="space-y-2!">
            <Swap {...props} />
        </Widget>
    else
        return <div className="w-full flex flex-col justify-between h-full space-y-2 text-secondary-text">
            <Swap {...props} />
        </div>

}

export default Container
