import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { FormSourceWalletButton } from "../Input/SourceWalletPicker";
import SwapButton from "../buttons/swapButton";
import { FormikErrors } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useSharedSecretDerivation } from "@train-protocol/react";
import { useAuthDialog } from "@/stores/authDialogStore";
import SubmitButton from "../buttons/submitButton";
import { captureEvent } from "@/lib/faro";

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
    const hasFullRoute = values.from && values.to && values.fromCurrency && values.toCurrency;

    // The rendered CTA variant IS the reason the user can't proceed — report it
    // once per state change so drop-off can be attributed to a blocking step.
    const ctaState = (hasFullRoute && hasUserAmount && !quote && !isQuoteLoading) ? "no_quote"
        : !isLoggedIn ? "login_required"
            : shouldConnectWallet ? "connect_wallet"
                : (values?.to && !values?.destination_address) ? "need_address"
                    : "ready";
    const prevCtaStateRef = useRef<string | undefined>(undefined);
    useEffect(() => {
        if (prevCtaStateRef.current === ctaState) return;
        prevCtaStateRef.current = ctaState;
        captureEvent("cta_state_shown", {
            state: ctaState,
            ...(ctaState === "no_quote" ? { message: solverErrorMessage || "Can't get quote" } : {}),
        });
    }, [ctaState, solverErrorMessage]);

    if (hasFullRoute && hasUserAmount && !quote && !isQuoteLoading) {
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
