import { FC } from "react";
import { useAtomicState, HTLCStatus } from "@/context/atomicContext";
import Summary from "./Summary";
import Details from "./Details";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../../shadcn/accordion";
import { formatUnits } from "fuels";
import { SwapQuote } from "@/lib/trainApiClient";
import { useSwapStore } from "@/stores/swapStore";

type MotionSummaryProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const MotionSummary: FC<MotionSummaryProps> = ({ quote, isQuoteLoading = false }) => {
    const { htlcStatus: commitStatus, commitFromApi, source_asset: source_token, destination_asset: destination_token, source_network, destination_network, amount, hashlock } = useAtomicState()

    const storedReceiveAmount = useSwapStore(s =>
        hashlock ? s.swaps[hashlock]?.receiveAmount : undefined
    )

    const receiveAmount = commitFromApi?.destinationAmount
        ? formatUnits(commitFromApi?.destinationAmount, destination_token?.decimals)
        : quote?.receiveAmount
            ? formatUnits(quote.receiveAmount, destination_token?.decimals)
            : storedReceiveAmount
                ? formatUnits(storedReceiveAmount, destination_token?.decimals)
                : undefined

    const assetsLocked = commitStatus === HTLCStatus.SecretRevealed || commitStatus === HTLCStatus.RedeemCompleted
    return (
        <>
            {
                destination_network && source_network && destination_token && source_token &&
                <Summary
                    destination={destination_network}
                    source={source_network}
                    destinationCurrency={destination_token}
                    requestedAmount={amount}
                    sourceCurrency={source_token}
                    receiveAmount={receiveAmount}
                />
            }
            {
                assetsLocked &&
                <Accordion type="single" collapsible >
                    <AccordionItem value="item-1" className="space-y-3">
                        <AccordionContent>
                            <Details />
                        </AccordionContent>
                        <div className="text-center flex justify-center w-full">
                            <AccordionTrigger className="w-fit text-secondary-text text-base">View details</AccordionTrigger>
                        </div>
                    </AccordionItem>
                </Accordion>
            }
        </>
    )
}

export default MotionSummary;