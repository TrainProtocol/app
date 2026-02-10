import { Form, useFormikContext } from "formik";
import { FC, useEffect, useMemo } from "react";
import React from "react";
import SourcePicker from "../../Input/SourcePicker";
import DestinationPicker from "../../Input/DestinationPicker";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Widget } from "../../Widget/Index";
import { useQueryState } from "../../../context/query";
import FeeDetailsComponent from "../../FeeDetails";
import { transformFormValuesToQuoteArgs, useQuoteData } from "../../../hooks/useFee";
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
                    <div className='flex-col relative flex justify-between gap-1.5 w-full leading-4'>
                        {!(query?.hideFrom && values?.from) && <div className="flex flex-col w-full">
                            <SourcePicker quote={quote} isQuoteLoading={isQuoteLoading} />
                        </div>}
                        {!(query?.hideTo && values?.to) && <div className="flex flex-col w-full">
                            <DestinationPicker quote={quote} isQuoteLoading={isQuoteLoading} />
                        </div>}
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