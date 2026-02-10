import { Form, useFormikContext } from "formik";
import { FC, useEffect, useMemo } from "react";
import React from "react";
import NetworkFormField from "../../Input/NetworkFormField";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Widget } from "../../Widget/Index";
import { useQueryState } from "../../../context/query";
import FeeDetailsComponent from "../../FeeDetails";
import { transformFormValuesToQuoteArgs, useQuoteData } from "../../../hooks/useFee";
import AmountField from "../../Input/Amount"
import ResizablePanel from "../../ResizablePanel";
import useWallet from "../../../hooks/useWallet";
import FormButton from "../FormButton";
import { hasRequiredDestinationWallet } from "../../../lib/wallets/utils/destinationWalletUtils";
import { SwapQuote } from "../../../lib/trainApiClient";

type SwapFormProps = {
    polling?: boolean
    onQuoteChange?: (quote: SwapQuote | undefined) => void
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
    const { quote, isQuoteLoading } = useQuoteData(params, polling ? 42000 : 0)

    useEffect(() => {
        onQuoteChange?.(quote)
    }, [quote, onQuoteChange])

    const actionDisplayName = query?.buttonTextColor || "Swap now"
    const shouldConnectWallet = !wallets.length;
    const shouldConnectDestinationWallet = !hasRequiredDestinationWallet(destination, providers);

    return <>
        <Form className={`h-full space-y-3 ${(isSubmitting) ? 'pointer-events-none' : 'pointer-events-auto'}`} >
            <ResizablePanel>
                <Widget.Content>
                    <div className='flex-col relative flex justify-between gap-1.5 w-full leading-4 bg-secondary-700 rounded-xl'>
                        {!(query?.hideFrom && values?.from) && <div className="flex flex-col w-full">
                            <NetworkFormField direction="from" label="From" className="rounded-t-xl pt-2.5" />
                        </div>}
                        {!(query?.hideTo && values?.to) && <div className="flex flex-col w-full">
                            <NetworkFormField direction="to" label="To" className="rounded-b-xl" />
                        </div>}
                    </div>
                    <div className="leading-4">
                        <AmountField />
                    </div>
                    <div className="w-full">
                        <FeeDetailsComponent values={values} quote={quote} isFeeLoading={isQuoteLoading} />
                    </div>
                </Widget.Content>
            </ResizablePanel>
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