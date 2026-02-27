import { FC } from "react";
import { useAtomicState } from "@/context/atomicContext";
import Summary from "./Summary";
import { SwapQuote } from "@/lib/trainApiClient";
import { useSwapStore } from "@/stores/swapStore";
import { formatUnits } from "viem";

type MotionSummaryProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const MotionSummary: FC<MotionSummaryProps> = ({ quote, isQuoteLoading = false }) => {
    const { htlcFromApi, source_asset: source_token, destination_asset: destination_token, source_network, destination_network, amount, hashlock } = useAtomicState()

    const storedReceiveAmount = useSwapStore(s =>
        hashlock ? s.swaps[hashlock]?.receiveAmount : undefined
    )

    const receiveAmount = (htlcFromApi?.destinationAmount && destination_token?.decimals)
        ? formatUnits(BigInt(htlcFromApi?.destinationAmount), destination_token?.decimals)
        : (quote?.receiveAmount && destination_token?.decimals)
            ? formatUnits(BigInt(quote.receiveAmount), destination_token?.decimals)
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