import dynamic from "next/dynamic";
import { FormSourceWalletButton } from "../Input/SourceWalletPicker";
import SwapButton from "../buttons/swapButton";
import { FormikErrors } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useSharedSecretDerivation } from "@train-protocol/react";
import { useAuthDialog } from "@/stores/authDialogStore";
import SubmitButton from "../buttons/submitButton";

const Address = dynamic(
    () => import("../Input/Address").then((mod) => mod.default),
    { loading: () => <></> }
);

const FormButton = ({
    quote,
    isQuoteLoading,
    shouldConnectWallet,
    values,
    isValid,
    errors,
    isSubmitting,
    actionDisplayName,
    solverErrorMessage,
}) => {
    const { isLoggedIn } = useSharedSecretDerivation();
    const openAuthDialog = useAuthDialog((s) => s.openAuthDialog);

    const hasUserAmount = values.amount || values.receiveAmount;
    if (values.from && values.to && values.fromCurrency && values.toCurrency && hasUserAmount && !quote && !isQuoteLoading) {
        return <SwapButton
            type="submit"
            isDisabled={true}
            isSubmitting={isSubmitting}
        >
            {solverErrorMessage || "Can't get quote"}
        </SwapButton>
    }

    if (!isLoggedIn) {
        return (
            <SubmitButton type="button" onClick={openAuthDialog}>
                Log in to continue
            </SubmitButton>
        );
    }

    if (shouldConnectWallet) {
        return <FormSourceWalletButton isDisabled={isSubmitting} />;
    }

    if (values?.to && !values?.destination_address) {
        return (
            <Address>
                {() => (
                    <SubmitButton type="button" className="w-full" isDisabled={isSubmitting}>
                        <span className="grow text-center">Enter destination address</span>
                    </SubmitButton>
                )}
            </Address>
        );
    }

    return (
        <SwapButton
            type="submit"
            isDisabled={!isValid}
            isSubmitting={isSubmitting}
        >
            {isQuoteLoading ? "Getting quote" : ActionText(errors, actionDisplayName)}
        </SwapButton>
    );
};

function ActionText(errors: FormikErrors<SwapFormValues>, actionDisplayName: string): string {
    return errors.from?.toString() as string
        || errors.to?.toString() as string
        || errors.fromCurrency as string
        || errors.toCurrency as string
        || errors.amount as string
        || errors.receiveAmount as string
        || (actionDisplayName)
}

export default FormButton;
