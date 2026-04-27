import dynamic from "next/dynamic";
import { FormSourceWalletButton } from "../Input/SourceWalletPicker";
import { PlusIcon } from "lucide-react";
import SwapButton from "../buttons/swapButton";
import { FormikErrors } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import KnownInternalNames from "../../lib/knownIds";
import { FC } from "react";
import { useFormikContext } from "formik";
import useWallet from "../../hooks/useWallet";
import { useConnectModal } from "../WalletModal";
import { useSharedSecretDerivation } from "@train-protocol/react";
import { useLoginModalStore } from "@/stores/loginModalStore";
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
    shouldConnectDestinationWallet,
    solverErrorMessage,
}) => {
    const { isLoggedIn } = useSharedSecretDerivation();
    const { open: openLogin } = useLoginModalStore();

    const hasUserAmount = values.amount || values.receiveAmount;
    if (values.from && values.to && values.fromCurrency && values.toCurrency && hasUserAmount && !quote && !isQuoteLoading) {
        return <SwapButton
            className="plausible-event-name=Swap+initiated"
            type="submit"
            isDisabled={true}
            isSubmitting={isSubmitting}
        >
            {solverErrorMessage || "Can't get quote"}
        </SwapButton>
    }

    if (!isLoggedIn) {
        return (
            <>
                <SubmitButton
                    type="button"
                    onClick={openLogin}
                >
                    Login to continue
                </SubmitButton>
            </>
        );
    }

    if (shouldConnectDestinationWallet) {
        return <FormDestinationWalletButton />;
    }

    if (shouldConnectWallet) {
        return <FormSourceWalletButton />;
    }

    if (values?.to && !values?.destination_address) {
        return (
            <Address>
                {() => (
                    <SubmitButton type="button" className="w-full">
                        <span className="grow text-center">Enter destination address</span>
                    </SubmitButton>
                )}
            </Address>
        );
    }

    return (
        <SwapButton
            className="plausible-event-name=Swap+initiated"
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

export const FormDestinationWalletButton: FC = () => {
    const {
        values
    } = useFormikContext<SwapFormValues>();

    const destinationNetwork = values.to;
    const { provider } = useWallet(destinationNetwork, 'withdrawal');
    const { connect } = useConnectModal();

    const handleConnect = async () => {
        const result = await connect(provider);
        // For destination wallet, we don't need to set selectedSourceAccount
        // The wallet connection is just to enable contract interactions
        return result;
    };

    const availableWallets = provider?.connectedWallets?.filter(w => !w.isNotAvailable) || [];

    if (!availableWallets.length && destinationNetwork) {
        return (
            <SubmitButton icon={<PlusIcon className="stroke-1" />} onClick={handleConnect}>
                Connect {destinationNetwork.displayName} wallet
            </SubmitButton>
        );
    }

    // If wallet is already connected, proceed with normal flow
    return null;
}

export default FormButton;