import { FC, useEffect, useMemo } from "react";
import { CommitStatus, useAtomicState } from "../../../../context/atomicContext";
import CheckedIcon from "../../../Icons/CheckedIcon";
import Summary from "./Summary";
import { ExternalLink } from "lucide-react";
import ConnectedWallet from "./ConnectedWallet";
import Link from "next/link";
import { usePulsatingCircles } from "../../../../context/PulsatingCirclesContext";
import { useRive } from "@rive-app/react-canvas";
import SpinIcon from "../../../Icons/spinIcon";
import { SwapQuote } from "../../../../lib/trainApiClient";
import SwapQuoteComp from "@/components/FeeDetails/SwapQuote";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";

type AtomicContentProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const AtomicContent: FC<AtomicContentProps> = ({ quote, isQuoteLoading = false }) => {

    const { commitStatus, destination_network, source_network, source_asset, destination_asset, amount } = useAtomicState()
    const secretRevealed = commitStatus === CommitStatus.SecretRevealed || commitStatus === CommitStatus.RedeemCompleted

    const { setPulseState } = usePulsatingCircles();

    const values: SwapFormValues = {
        amount: amount?.toString(),
        from: source_network,
        to: destination_network,
        fromCurrency: source_asset,
        toCurrency: destination_asset,
    }

    useEffect(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            setPulseState("completed");
        }
        else if (secretRevealed) {
            setPulseState("pulsing");
        }
    }, [secretRevealed, commitStatus]);

    return (
        <>
            {/* <ReleasingAssets
                            commitStatus={commitStatus}
                            redeemTxLink={destRedeemTx && getExplorerUrl(`destination_network?.transactionExplorerTemplate`, destRedeemTx)}
                        /> */}
            <Summary quote={quote} isQuoteLoading={isQuoteLoading} />
            <SwapQuoteComp values={values} quote={quote} isQuoteLoading={isQuoteLoading} />
            <ConnectedWallet />
        </>

    )
}

const ReleasingAssets: FC<{ commitStatus: CommitStatus, redeemTxLink: string | undefined }> = ({ commitStatus, redeemTxLink }) => {

    const ResolvedIcon = useMemo(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return <CheckedIcon className="h-16 w-auto text-accent" />
        }
        return <RiveComponent />
    }, [commitStatus])

    const ResolvedTitle = useMemo(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return <p className="text-3xl text-primary-text">
                Swap Completed
            </p>
        }
        return <p className="text-xl text-primary-text">
            Releasing assets
        </p>
    }, [commitStatus])

    const ResolvedDescription = useMemo(() => {
        if (commitStatus === CommitStatus.RedeemCompleted) {
            return redeemTxLink ?
                <div className="w-full flex justify-center">
                    <Link
                        href={redeemTxLink}
                        target='_blank'
                        className="p-1 px-4 rounded-full bg-secondary-700 flex gap-2 items-center text-secondary-text"
                    >
                        <p>
                            View transaction
                        </p>
                        <ExternalLink className="h-4 w-auto" />
                    </Link>
                </div>
                :
                <div className="w-full flex justify-center opacity-75">
                    <div
                        className="p-1 px-4 rounded-full bg-secondary-700 flex gap-2 items-center text-secondary-text"
                    >
                        <p>
                            View transaction
                        </p>
                        <SpinIcon className="h-4 w-auto animate-reverse-spin" />
                    </div>
                </div>

        }
        return <p className="text-base text-secondary-text max-w-xs mx-auto">
            You will receive your assets at the destination address shortly.
        </p>
    }, [commitStatus, redeemTxLink])

    const show = commitStatus === CommitStatus.RedeemCompleted || commitStatus === CommitStatus.SecretRevealed

    return (
        <div
            style={{
                opacity: show ? 1 : 0,
                height: show ? 'auto' : '172px',
            }}
            className="flex flex-col gap-6 pt-10 pb-4 transition-all duration-500"
        >
            {ResolvedIcon}
            <div className="text-center space-y-2">
                {ResolvedTitle}
                {ResolvedDescription}
            </div>
        </div>
    )
}

export default AtomicContent;

const RiveComponent = () => {
    const { pulseState } = usePulsatingCircles();

    const { RiveComponent: RiveAnimation, rive } = useRive({
        src: "/finalload.riv",
        stateMachines: "State Machine 1",
        autoplay: true,
    });

    useEffect(() => {
        if (rive) {
            const inputs = rive.stateMachineInputs("State Machine 1");
            if (inputs && inputs.length > 0) {
                const input = inputs[0];

                if (pulseState === "pulsing") {
                    input.value = 0;
                } else if (pulseState === "completed") {
                    input.value = 2;
                }
            }
        }
    }, [pulseState, rive]);

    return (
        <div className="h-[136px] w-[136px] m-auto">
            <RiveAnimation />
        </div>
    );
};
