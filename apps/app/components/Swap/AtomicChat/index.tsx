import { FC, useMemo } from "react";
import { Widget } from "../../Widget/Index";
import { Actions, SwapViewType } from "./Actions";
import AtomicContent from "./AtomicContent";
import { useSwapData } from "@/hooks/useSwapData";
import { buildQuoteParamsFromAtomic, useQuoteData } from "../../../hooks/useFee";

type ContainerProps = {
    type: SwapViewType,
}

const Swap: FC<ContainerProps> = ({ type }) => {
    const { source_network, destination_network, source_asset, destination_asset, amount, hashlock } = useSwapData();

    const quoteParams = useMemo(() => {
        if (hashlock) return undefined;
        return buildQuoteParamsFromAtomic({
            from: source_network?.caip2Id,
            to: destination_network?.caip2Id,
            fromCurrency: source_asset,
            toCurrency: destination_asset,
            amount: amount != null ? String(amount) : undefined,
        });
    }, [hashlock, source_network?.caip2Id, destination_network?.caip2Id, source_asset, destination_asset, amount]);

    const { quote, isQuoteLoading } = useQuoteData(quoteParams, 42000);

    return (
        <>
            <Widget.Content>
                <AtomicContent quote={quote} isQuoteLoading={isQuoteLoading} />
            </Widget.Content>
            <Actions quote={quote} type={type} />
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
