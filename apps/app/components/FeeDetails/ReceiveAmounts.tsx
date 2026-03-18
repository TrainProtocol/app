import { FC } from "react";
import { Token } from "../../Models/Network";
import { SwapQuote } from "../../lib/trainApiClient";
import { truncateDecimals } from "../utils/RoundDecimals";
import formatAmount from "@/lib/formatAmount";

type WillReceiveProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: SwapQuote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ source_token, destination_token, fee, isFeeLoading }) => {

    const receive_amount_in_base_units = fee?.receiveAmount
    const receive_amount = destination_token ? formatAmount(BigInt(receive_amount_in_base_units ?? 0), destination_token?.decimals) : null;
    const parsedReceiveAmount = receive_amount ? truncateDecimals(Number(receive_amount), destination_token?.decimals) : null;

    return <div className="w-full h-full">
        <div className="flex items-center justify-between w-full">
            <span className="md:font-semibold text-sm md:text-base text-primary-text leading-8 md:leading-8 flex-1">
                You will receive
            </span>
            {isFeeLoading ? (
                <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-sm animate-pulse self-center' />
            ) :
                <div className="text-sm md:text-base flex flex-col items-end">
                    {
                        source_token && destination_token && Number(parsedReceiveAmount) > 0 ?
                            <div className="font-semibold md:font-bold text-right leading-8">
                                <div className="flex items-center justify-end">
                                    <p>
                                        <>{parsedReceiveAmount}</>
                                        &nbsp;
                                        <span>
                                            {destination_token?.symbol}
                                        </span>
                                        {/* {
                                            receiveAmountInUsd !== undefined && Number(receiveAmountInUsd) > 0 &&
                                            <span className="text-secondary-text text-xs font-medium ml-1 block md:inline-block">
                                                (${receiveAmountInUsd})
                                            </span>
                                        } */}
                                    </p>
                                </div>
                            </div>
                            : '-'
                    }
                </div>
            }
        </div>
    </div>

}