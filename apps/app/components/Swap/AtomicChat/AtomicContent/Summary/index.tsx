import { FC } from "react";
import { useSwapData } from "@/hooks/useSwapData";
import { useActiveSwapState } from "@/hooks/useActiveSwapState";
import { useSwap } from "@train-protocol/react";
import Summary from "./Summary";
import type { SwapQuote } from "@train-protocol/sdk";
import { formatUnits } from "viem";
import { useSwapStore } from "@/stores/swapStore";

type MotionSummaryProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const MotionSummary: FC<MotionSummaryProps> = ({ quote, isQuoteLoading = false }) => {
    const { source_asset: source_token, destination_asset: destination_token, source_network, destination_network, amount } = useSwapData()
    const { htlcFromApi } = useActiveSwapState()
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const currentSwap = useSwap(activeHashlock)

    const storedReceiveAmount = currentSwap?.receiveAmount

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
