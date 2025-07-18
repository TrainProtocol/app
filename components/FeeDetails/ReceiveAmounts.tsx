import { FC } from "react";
import { Token } from "../../Models/Network";
import { Quote } from "../../lib/trainApiClient";

type WillReceiveProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ source_token, destination_token, fee, isFeeLoading }) => {

    // const receiveAmountInUsd = fee?.quote?.receiveAmountInUsd ? fee?.quote.receiveAmountInUsd.toFixed(2) : undefined

    const receive_amount_in_base_units = fee?.quote?.receiveAmount
    const receive_amount = (receive_amount_in_base_units && destination_token) ? (Number(receive_amount_in_base_units) / Math.pow(10, destination_token?.decimals)) : null;
    const parsedReceiveAmount = parseFloat(receive_amount?.toFixed(destination_token?.decimals) || "")


    return <div className="w-full h-full">
        <div className="flex items-center justify-between w-full">
            <span className="md:font-semibold text-sm md:text-base text-primary-buttonTextColor leading-8 md:leading-8 flex-1">
                You will receive
            </span>
            {isFeeLoading ? (
                <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-sm animate-pulse self-center' />
            ) :
                <div className="text-sm md:text-base flex flex-col items-end">
                    {
                        source_token && destination_token && parsedReceiveAmount > 0 ?
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