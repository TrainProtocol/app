import { FC } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import type { SwapQuote } from "@train-protocol/react";
import Summary from "./Summary";
import { formatUnits } from "viem";

type MotionSummaryProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const MotionSummary: FC<MotionSummaryProps> = ({ quote, isQuoteLoading = false }) => {
    const {
        sourceToken, destinationToken, sourceNetwork, destinationNetwork,
        requestedAmount, receiveAmount: storedReceiveAmount, htlcFromApi,
    } = useActiveSwap()

    const amount = requestedAmount ? Number(requestedAmount) : undefined

    const receiveAmount = (htlcFromApi?.destinationAmount && destinationToken?.decimals)
        ? formatUnits(BigInt(htlcFromApi?.destinationAmount), destinationToken?.decimals)
        : (quote?.receiveAmount && destinationToken?.decimals)
            ? formatUnits(BigInt(quote.receiveAmount), destinationToken?.decimals)
            : storedReceiveAmount

    return (
        <>
            {
                destinationNetwork && sourceNetwork && destinationToken && sourceToken &&
                <Summary
                    destination={destinationNetwork}
                    source={sourceNetwork}
                    destinationCurrency={destinationToken}
                    requestedAmount={amount}
                    sourceCurrency={sourceToken}
                    receiveAmount={receiveAmount ?? undefined}
                />
            }
        </>
    )
}

export default MotionSummary;
