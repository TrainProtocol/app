import { FC } from "react";
import { useFormikContext } from "formik";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import { useFee } from "../../context/feeContext";

const DetailedEstimates: FC = () => {

    const { values } = useFormikContext<SwapFormValues>();
    const { fromCurrency } = values;
    const { fee, isFeeLoading } = useFee()

    const fee_amount_in_base_units = fee?.quote?.totalFee
    const fee_amount = (fee_amount_in_base_units && fromCurrency) ? (Number(fee_amount_in_base_units) / Math.pow(10, fromCurrency?.decimals)) : null;

    const parsedFee = (fee?.quote && fromCurrency) && parseFloat(Number(fee_amount).toFixed(Math.min(fromCurrency?.decimals, 8)))
    const currencyName = fromCurrency?.symbol || " "
    // const feeAmountInUsd = fee?.quote?.totalFeeInUsd

    const displayFee = fromCurrency && parsedFee?.toFixed(Math.min(fromCurrency?.decimals, 8))
    // const displayFeeInUsd = feeAmountInUsd ? (feeAmountInUsd < 0.01 ? '<$0.01' : `$${feeAmountInUsd?.toFixed(2)}`) : undefined

    return <div className="flex flex-col w-full gap-2">
        <div className="flex justify-between w-full items-center">
            <div className="flex items-baseline w-full justify-between gap-1">
                <label className="inline-flex items-center text-left text-primary-buttonTextColor">
                    Fee
                </label>
                <div className="text-right text-secondary-text ">
                    {isFeeLoading ? (
                        <div className='h-[10px] w-16 inline-flex bg-gray-500 rounded-sm animate-pulse' />
                    ) : (
                        <div>
                            <span>{displayFee || '-'} </span>
                            <span>{parsedFee ? currencyName : ''}</span>
                            {/* {displayFeeInUsd !== undefined && (
                                <span className="text-xs ml-1 font-medium">
                                    ({displayFeeInUsd})
                                </span>
                            )} */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
}

export default DetailedEstimates