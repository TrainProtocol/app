import { FC, useMemo } from "react";
import { Widget } from "../../Widget/Index";
import { Actions, SwapViewType } from "./Actions";
import AtomicContent from "./AtomicContent";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import { useFormikContext } from "formik";
import type { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { buildQuoteParamsFromAtomic, useQuoteData } from "../../../hooks/useFee";

type ContainerProps = {
    type: SwapViewType,
}

const Swap: FC<ContainerProps> = ({ type }) => {
    const swap = useActiveSwap()
    const { values } = useFormikContext<SwapFormValues>()

    // Post-lock: use derived state. Pre-lock: use Formik values.
    const sourceNetwork = swap.sourceNetwork ?? values?.from
    const destinationNetwork = swap.destinationNetwork ?? values?.to
    const sourceAsset = swap.sourceToken ?? values?.fromCurrency
    const destinationAsset = swap.destinationToken ?? values?.toCurrency
    const amount = swap.requestedAmount ?? values?.amount
    const hashlock = swap.hashlock

    const quoteParams = useMemo(() => {
        if (hashlock) return undefined;
        return buildQuoteParamsFromAtomic({
            from: sourceNetwork?.caip2Id,
            to: destinationNetwork?.caip2Id,
            fromCurrency: sourceAsset,
            toCurrency: destinationAsset,
            amount: amount != null ? String(amount) : undefined,
        });
    }, [hashlock, sourceNetwork?.caip2Id, destinationNetwork?.caip2Id, sourceAsset, destinationAsset, amount]);

    const { quote, solverId, isQuoteLoading } = useQuoteData(quoteParams, 42000);

    return (
        <>
            <Widget.Content>
                <AtomicContent quote={quote} isQuoteLoading={isQuoteLoading} />
            </Widget.Content>
            <Actions quote={quote} solverId={solverId} type={type} />
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
