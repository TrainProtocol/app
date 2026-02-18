import { FC } from "react";
import { useAtomicState } from "@/context/atomicContext";
import Summary from "./Summary";
import { formatUnits } from "fuels";
import { SwapQuote } from "@/lib/trainApiClient";
import { useSwapStore } from "@/stores/swapStore";

type MotionSummaryProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const MotionSummary: FC<MotionSummaryProps> = ({ quote, isQuoteLoading = false }) => {
    const { htlcStatus: commitStatus, htlcFromApi: commitFromApi, source_asset: source_token, destination_asset: destination_token, source_network, destination_network, amount, hashlock } = useAtomicState()

    const storedReceiveAmount = useSwapStore(s =>
        hashlock ? s.swaps[hashlock]?.receiveAmount : undefined
    )

    const receiveAmount = commitFromApi?.destinationAmount
        ? formatUnits(commitFromApi?.destinationAmount, destination_token?.decimals)
        : quote?.receiveAmount
            ? formatUnits(quote.receiveAmount, destination_token?.decimals)
            : storedReceiveAmount

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
        </>
    )
}

export default MotionSummary;