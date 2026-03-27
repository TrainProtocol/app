import { FC } from "react";
import type { SwapQuote } from "@train-protocol/react";
import type { Network, Token } from "@/Models/Network";
import type { HTLCFromApi } from "@train-protocol/sdk";
import Summary from "./Summary";
import { formatUnits } from "viem";

type MotionSummaryProps = {
    sourceNetwork: Network
    destinationNetwork: Network
    sourceToken: Token
    destinationToken: Token
    requestedAmount?: number
    receiveAmount?: string | null
    htlcFromApi?: HTLCFromApi | null
    quote?: SwapQuote
}

const MotionSummary: FC<MotionSummaryProps> = ({
    sourceNetwork, destinationNetwork, sourceToken, destinationToken,
    requestedAmount, receiveAmount: storedReceiveAmount, htlcFromApi, quote,
}) => {
    const receiveAmount = (htlcFromApi?.destinationAmount && destinationToken?.decimals)
        ? formatUnits(BigInt(htlcFromApi?.destinationAmount), destinationToken?.decimals)
        : (quote?.receiveAmount && destinationToken?.decimals)
            ? formatUnits(BigInt(quote.receiveAmount), destinationToken?.decimals)
            : storedReceiveAmount

    return (
        <Summary
            destination={destinationNetwork}
            source={sourceNetwork}
            destinationCurrency={destinationToken}
            requestedAmount={requestedAmount}
            sourceCurrency={sourceToken}
            receiveAmount={receiveAmount ?? undefined}
        />
    )
}

export default MotionSummary;
