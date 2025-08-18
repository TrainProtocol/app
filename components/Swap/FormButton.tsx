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

const Address = dynamic(
    () => import("../Input/Address/index.tsx").then((mod) => mod.default),
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
    shouldConnectDestinationWallet
}) => {

    if (values.from && values.to && values.fromCurrency && values.toCurrency && values.amount && !quote && !isQuoteLoading) {
        return <SwapButton
            className="plausible-event-name=Swap+initiated"
            type="submit"
            isDisabled={true}
            isSubmitting={isSubmitting}
        >
            Can't get quote
        </SwapButton>
    }

    if (shouldConnectDestinationWallet) {
        return <FormDestinationWalletButton />;
    }

    if (shouldConnectWallet) {
        return <FormSourceWalletButton />;
    }

    const isAztecDestination = values?.to?.name === KnownInternalNames.Networks.AztecTestnet;

    if (values?.to && !values?.destination_address && !isAztecDestination) {
        return (
            <div className="flex items-center col-span-6">
                <Address>{SecondDestinationWalletPicker}</Address>
            </div>
        );
    }

    return (
        <SwapButton
            className="plausible-event-name=Swap+initiated"
            type="submit"
            isDisabled={!isValid}
            isSubmitting={isSubmitting}
        >
            {ActionText(errors, actionDisplayName)}
        </SwapButton>
    );
};

function ActionText(errors: FormikErrors<SwapFormValues>, actionDisplayName: string): string {
    return errors.from?.toString()
        || errors.to?.toString()
        || errors.fromCurrency
        || errors.toCurrency
        || errors.amount
        || (actionDisplayName)
}

export const SecondDestinationWalletPicker = () => {
    return <div className="border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-componentRoundness transform hover:brightness-125 transition duration-200 ease-in-out bg-primary text-primary-actionButtonText py-3 px-2 md:px-3 plausible-event-name=Swap+initiated">
        <div className="flex justify-center space-x-2">
            <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                <PlusIcon className="stroke-1" />
            </span>
            <span className="grow text-center">Enter destination address</span>
        </div>
    </div>
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
            <div className="border border-primary disabled:border-primary-900 items-center space-x-1 disabled:text-opacity-40 disabled:bg-primary-900 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-componentRoundness transform hover:brightness-125 transition duration-200 ease-in-out bg-primary text-primary-actionButtonText py-3 px-2 md:px-3 plausible-event-name=Connect+Destination+Wallet"
                onClick={handleConnect}>
                <div className="flex justify-center space-x-2">
                    <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                        <PlusIcon className="stroke-1" />
                    </span>
                    <span className="grow text-center">Connect {destinationNetwork.displayName} wallet</span>
                </div>
            </div>
        );
    }

    // If wallet is already connected, proceed with normal flow
    return null;
}

export default FormButton;