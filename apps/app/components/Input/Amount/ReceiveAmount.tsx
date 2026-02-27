import { FC } from "react";
import { Token } from "@/Models/Network";
import { SwapQuote } from "@/lib/trainApiClient";
import NumberFlow from "@number-flow/react";
import clsx from "clsx";
import formatAmount from "@/lib/formatAmount";

type ReceiveAmountProps = {
    destination_token: Token | undefined;
    quote: SwapQuote | undefined;
    isQuoteLoading: boolean;
}

export const ReceiveAmount: FC<ReceiveAmountProps> = ({ destination_token, quote, isQuoteLoading }) => {
    const receive_amount_in_base_units = quote?.receiveAmount
    const receive_amount = destination_token ? formatAmount(BigInt(receive_amount_in_base_units ?? 0), destination_token?.decimals) : null;
    const receiveAmountInUsd = receive_amount && destination_token?.priceInUsd
        ? (Number(receive_amount) * destination_token.priceInUsd).toFixed(2)
        : undefined;

    return (
        <div className="flex-col w-full flex min-w-0 font-normal border-0 text-[28px] leading-7 text-primary-text relative truncate">
            <div className="w-full flex items-center justify-start relative">
                <div className={clsx(
                    "w-full flex items-center py-[3px] pr-3",
                    { "animate-pulse-stronger": isQuoteLoading },
                    { "text-secondary-text": !receive_amount }
                )}>
                    <NumberFlow
                        value={receive_amount ? Number(receive_amount) : 0}
                        format={{ maximumFractionDigits: destination_token?.decimals || 2 }}
                    />
                </div>
            </div>
            <div className="flex items-baseline space-x-2">
                <span className="text-base leading-5 font-medium text-secondary-text h-5">
                    <NumberFlow
                        className="p-0"
                        value={receiveAmountInUsd ? parseFloat(receiveAmountInUsd) : 0}
                        prefix="$"
                        format={{ minimumFractionDigits: receiveAmountInUsd ? 2 : 0, maximumFractionDigits: receiveAmountInUsd ? 2 : 0 }}
                    />
                </span>
            </div>
        </div>
    )
}
