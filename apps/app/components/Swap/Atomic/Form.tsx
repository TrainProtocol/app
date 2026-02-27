import { Form, useFormikContext } from "formik";
import { FC, useEffect, useMemo } from "react";
import React from "react";
import SourcePicker from "../../Input/SourcePicker";
import DestinationPicker from "../../Input/DestinationPicker";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Widget } from "../../Widget/Index";
import { useQueryState } from "../../../context/query";
import { transformFormValuesToQuoteArgs, useQuoteData } from "../../../hooks/useFee";
import useWallet from "../../../hooks/useWallet";
import FormButton from "../FormButton";
import { hasRequiredDestinationWallet } from "../../../lib/wallets/utils/destinationWalletUtils";
import { SwapQuote } from "../../../lib/trainApiClient";
import QuoteDetails from "@/apps/app/components/FeeDetails";
import ReverseRouteButton from "./ReverseRouteButton";

type SwapFormProps = {
    polling?: boolean
    onQuoteChange?: (quote: SwapQuote | undefined, solverId: string | undefined) => void
}

const SwapForm: FC<SwapFormProps> = ({ polling = true, onQuoteChange }) => {
    const {
        values,
        errors, isValid, isSubmitting
    } = useFormikContext<SwapFormValues>();
    const {
        to: destination,
    } = values
    const { providers, wallets } = useWallet()
    const query = useQueryState()

    const params = useMemo(() => transformFormValuesToQuoteArgs(values), [values])
    const { quote, solverId, isQuoteLoading } = useQuoteData(params, polling ? 42000 : 0)

    useEffect(() => {
        onQuoteChange?.(quote, solverId)
    }, [quote, solverId, onQuoteChange])

    const actionDisplayName = query?.buttonTextColor || "Swap now"
    const shouldConnectWallet = !wallets.length;
    const shouldConnectDestinationWallet = !hasRequiredDestinationWallet(destination, providers);

    return <>
        <Form className={`h-full space-y-2 ${(isSubmitting) ? 'pointer-events-none' : 'pointer-events-auto'}`} >
            <Widget.Content>
                <div className='flex-col relative flex justify-between gap-1.5 w-full leading-4'>
                    {!(query?.hideFrom && values?.from) && <div className="flex flex-col w-full">
                        <SourcePicker quote={quote} isQuoteLoading={isQuoteLoading} />
                    </div>}
                    {!(query?.hideFrom && values?.from) && !(query?.hideTo && values?.to) && <ReverseRouteButton />}
                    {!(query?.hideTo && values?.to) && <div className="flex flex-col w-full">
                        <DestinationPicker quote={quote} isQuoteLoading={isQuoteLoading} />
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
    </>
}

export default SwapForm