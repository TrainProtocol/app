import { FC } from "react";
import { Token } from "../../Models/Network";
import { Quote } from "../../lib/layerSwapApiClient";

type WillReceiveProps = {
    destination_token: Token | undefined;
    source_token: Token | undefined;
    fee: Quote | undefined;
    isFeeLoading: boolean;
}
export const ReceiveAmounts: FC<WillReceiveProps> = ({ source_token, destination_token, fee, isFeeLoading }) => {
    const receive_amount = fee?.quote?.receive_amount
    const parsedReceiveAmount = parseFloat(receive_amount?.toFixed(destination_token?.decimals) || "")

    const receiveAmountInUsd = receive_amount && destination_token && fee.quote?.destination_token?.price_in_usd ? (receive_amount * fee.quote.destination_token.price_in_usd).toFixed(2) : undefined

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
                                        {
                                            receiveAmountInUsd !== undefined && Number(receiveAmountInUsd) > 0 &&
                                            <span className="text-secondary-text text-xs font-medium ml-1 block md:inline-block">
                                                (${receiveAmountInUsd})
                                            </span>
                                        }
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