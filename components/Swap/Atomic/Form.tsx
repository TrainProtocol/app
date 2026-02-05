import { Form, useFormikContext } from "formik";
import { FC, useEffect } from "react";
import React from "react";
import NetworkFormField from "../../Input/NetworkFormField";
import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { Widget } from "../../Widget/Index";
import { useQueryState } from "../../../context/query";
import FeeDetailsComponent from "../../FeeDetails";
import { useFee } from "../../../context/feeContext";
import AmountField from "../../Input/Amount"
import ResizablePanel from "../../ResizablePanel";
import useWallet from "../../../hooks/useWallet";
import FormButton from "../FormButton";
import { hasRequiredDestinationWallet } from "../../../lib/wallets/utils/destinationWalletUtils";


const SwapForm: FC = () => {
    const {
        values,
        errors, isValid, isSubmitting
    } = useFormikContext<SwapFormValues>();
    const {
        to: destination,
    } = values
    const { providers, wallets } = useWallet()
    const { valuesChanger } = useFee()

    const query = useQueryState();
    const { fee, isFeeLoading } = useFee()

    const actionDisplayName = query?.buttonTextColor || "Swap now"

    useEffect(() => {
        valuesChanger(values)
    }, [values])

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
                        <FeeDetailsComponent values={values} />
                    </div>
                </Widget.Content>
            </ResizablePanel>
            <Widget.Footer>
                <FormButton
                    quote={fee?.quote}
                    isQuoteLoading={isFeeLoading}
                    shouldConnectWallet={shouldConnectWallet}
                    shouldConnectDestinationWallet={shouldConnectDestinationWallet}
                    values={values}
                    isValid={isValid && fee?.quote !== undefined}
                    errors={errors}
                    isSubmitting={isSubmitting || isFeeLoading}
                    actionDisplayName={actionDisplayName}
                />
            </Widget.Footer>
        </Form>
    </>
}

export default SwapForm