import { Form, useFormikContext } from "formik";
import { FC, useEffect, useMemo } from "react";
import React from "react";
import SourcePicker from "../../Input/SourcePicker";
import DestinationPicker from "../../Input/DestinationPicker";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Widget } from "../../Widget/Index";
import { useQueryState } from "@/context/query";
import { transformFormValuesToQuoteArgs, useQuoteData } from "@/hooks/useFee";
import useWallet from "@/hooks/useWallet";
import FormButton from "../FormButton";
import { hasRequiredDestinationWallet } from "@/lib/wallets/utils/destinationWalletUtils";
import type { SwapQuote } from "@train-protocol/react";
import QuoteDetails from "@/components/FeeDetails";
import ReverseRouteButton from "./ReverseRouteButton";
import { useQuoteDirection } from "@/context/quoteDirectionContext";

type SwapFormProps = {
    polling?: boolean
    onQuoteChange?: (quote: SwapQuote | undefined, solverId: string | undefined) => void
}

const SwapForm: FC<SwapFormProps> = ({ polling = true, onQuoteChange }) => {
    const {
        values,
        errors, isValid, isSubmitting,
    } = useFormikContext<SwapFormValues>();
    const {
        to: destination,
    } = values
    const { providers, wallets } = useWallet(values.from, 'withdrawal')
    const query = useQueryState()
    const { quoteDirection } = useQuoteDirection()

    const params = useMemo(() => transformFormValuesToQuoteArgs(values, quoteDirection), [values, quoteDirection])
    const { quote, solverId, isQuoteLoading } = useQuoteData(params, polling ? 42000 : 0)

    useEffect(() => {
        onQuoteChange?.(quote, solverId)
    }, [quote, solverId, onQuoteChange])

    const actionDisplayName = query?.buttonTextColor || "Swap now"
    const shouldConnectWallet = values.from && !wallets.length;
    const shouldConnectDestinationWallet = values.to && !hasRequiredDestinationWallet(destination, providers);

    return <Form className={`h-full space-y-2 ${(isSubmitting) ? 'pointer-events-none' : 'pointer-events-auto'}`} >
        <Widget.Content>
            <div className='flex-col relative flex justify-between gap-1.5 w-full leading-4'>
                {!(query?.hideFrom && values?.from) && <div className="flex flex-col w-full">
                    <SourcePicker isQuoteLoading={isQuoteLoading} quote={quote} />
                </div>}
                {!(query?.hideFrom && values?.from) && !(query?.hideTo && values?.to) && <ReverseRouteButton />}
                {!(query?.hideTo && values?.to) && <div className="flex flex-col w-full">
                    <DestinationPicker isQuoteLoading={isQuoteLoading} quote={quote} />
                </div>}
            </div>
            <QuoteDetails values={values} quote={quote} isQuoteLoading={isQuoteLoading} />
        </Widget.Content>
        <Widget.Footer>
            <FormButton
                quote={quote}
                isQuoteLoading={isQuoteLoading}
                shouldConnectWallet={shouldConnectWallet}
                shouldConnectDestinationWallet={shouldConnectDestinationWallet}
                values={values}
                isValid={isValid && quote !== undefined}
                errors={errors}
                isSubmitting={isSubmitting || isQuoteLoading}
                actionDisplayName={actionDisplayName}
            />
        </Widget.Footer>
    </Form>
}

export default SwapForm