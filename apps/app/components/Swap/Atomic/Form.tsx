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
import { FocusFieldProvider } from "@/context/focusFieldContext";
import formatAmount from "@/lib/formatAmount";

type SwapFormProps = {
    polling?: boolean
    onQuoteChange?: (quote: SwapQuote | undefined, solverId: string | undefined) => void
}

const SwapForm: FC<SwapFormProps> = ({ polling = true, onQuoteChange }) => {
    const {
        values,
        errors, isValid, isSubmitting,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const {
        to: destination,
    } = values
    const { providers, wallets } = useWallet(values.from, 'withdrawal')
    const query = useQueryState()

    const params = useMemo(() => transformFormValuesToQuoteArgs(values), [values])
    const { quote, solverId, isQuoteLoading } = useQuoteData(params, polling ? 42000 : 0)

    useEffect(() => {
        onQuoteChange?.(quote, solverId)
    }, [quote, solverId, onQuoteChange])

    const fromDecimals = values.fromCurrency?.decimals
    const toDecimals = values.toCurrency?.decimals
    useEffect(() => {
        const direction = values.quoteDirection ?? 'source'
        if (!quote || fromDecimals == null || toDecimals == null) {
            if (direction === 'source') setFieldValue('receiveAmount', '', false)
            else setFieldValue('amount', '', false)
            return
        }
        if (direction === 'destination' && quote.amount) {
            setFieldValue('amount', formatAmount(BigInt(quote.amount), fromDecimals), false)
        } else if (direction === 'source' && quote.receiveAmount) {
            setFieldValue('receiveAmount', formatAmount(BigInt(quote.receiveAmount), toDecimals), false)
        }
    }, [quote, values.quoteDirection, fromDecimals, toDecimals, setFieldValue])

    const actionDisplayName = query?.buttonTextColor || "Swap now"
    const shouldConnectWallet = values.from && !wallets.length;
    const shouldConnectDestinationWallet = values.to && !hasRequiredDestinationWallet(destination, providers);

    return <FocusFieldProvider>
        <Form className={`h-full space-y-2 ${(isSubmitting) ? 'pointer-events-none' : 'pointer-events-auto'}`} >
            <Widget.Content>
                <div className='flex-col relative flex justify-between gap-1.5 w-full leading-4'>
                    {!(query?.hideFrom && values?.from) && <div className="flex flex-col w-full">
                        <SourcePicker isQuoteLoading={isQuoteLoading} />
                    </div>}
                    {!(query?.hideFrom && values?.from) && !(query?.hideTo && values?.to) && <ReverseRouteButton />}
                    {!(query?.hideTo && values?.to) && <div className="flex flex-col w-full">
                        <DestinationPicker isQuoteLoading={isQuoteLoading} />
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
    </FocusFieldProvider>
}

export default SwapForm