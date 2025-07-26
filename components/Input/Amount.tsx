import { useFormikContext } from "formik";
import { forwardRef, useRef, useState } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import NumericInput from "./NumericInput";
import { useFee } from "../../context/feeContext";
import dynamic from "next/dynamic";
import { useQueryState } from "../../context/query";
import useSWRGas from "../../lib/gases/useSWRGas";
import useSWRBalance from "../../lib/balances/useSWRBalance";
import { useAtomicState } from "../../context/atomicContext";

const MinMax = dynamic(() => import("./dynamic/MinMax.tsx").then(mod => mod.default), {
    loading: () => <></>,
});

const AmountField = forwardRef(function AmountField(_, ref: any) {

    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, to, amount, toCurrency } = values || {};
    const { minAllowedAmount, maxAllowedAmount: maxAmountFromApi, fee, isFeeLoading } = useFee()
    const { selectedSourceAccount } = useAtomicState()
    const [isFocused, setIsFocused] = useState(false);
    const sourceAddress = selectedSourceAccount?.address
    const requestedAmountInUsd = fee?.quote?.sourceAmountInUsd
    const { balance, isBalanceLoading } = useSWRBalance(sourceAddress, from)
    const { gas, isGasLoading } = useSWRGas(sourceAddress, from, fromCurrency)
    const gasAmount = gas || 0;
    const native_currency = from?.nativeToken
    const query = useQueryState()

    const name = "amount"
    const walletBalance = balance?.find(b => b?.network === from?.name && b?.token === fromCurrency?.symbol)
    let maxAllowedAmount: number | null = maxAmountFromApi || 0

    if (query.balances && fromCurrency) {
        try {
            const balancesFromQueries = new URL(window.location.href.replaceAll('&quot;', '"')).searchParams.get('balances');
            const parsedBalances = balancesFromQueries && JSON.parse(balancesFromQueries)
            let balancesTyped = parsedBalances
            if (balancesTyped && balancesTyped[fromCurrency.symbol] && balancesTyped[fromCurrency.symbol] > Number(minAllowedAmount)) {
                maxAllowedAmount = Math.min(maxAllowedAmount, balancesTyped[fromCurrency.symbol]);
            }
        }
        // in case the query parameter had bad formatting just ignoe
        catch { }
    } else if (walletBalance && (walletBalance.amount >= Number(minAllowedAmount) && walletBalance.amount <= Number(maxAmountFromApi))) {
        if (((native_currency?.symbol === fromCurrency?.symbol) || !native_currency) && ((walletBalance.amount - gasAmount) >= Number(minAllowedAmount) && (walletBalance.amount - gasAmount) <= Number(maxAmountFromApi))) {
            maxAllowedAmount = walletBalance.amount - gasAmount
        }
        else maxAllowedAmount = walletBalance.amount
    }
    else {
        maxAllowedAmount = Number(maxAmountFromApi) || 0
    }

    const placeholder = (fromCurrency && toCurrency && from && to && minAllowedAmount && !isBalanceLoading && !isGasLoading) ? `${minAllowedAmount} - ${maxAmountFromApi}` : '0.0'
    const step = 1 / Math.pow(10, (fromCurrency && Math.min(fromCurrency?.decimals, 8)) || 1)
    const amountRef = useRef(ref)

    return (<>
        <p className="block font-semibold text-secondary-text text-xs mb-1 p-2">Amount</p>
        <div className="flex w-full justify-between bg-secondary-700 rounded-componentRoundness">
            <div className="relative w-full">
                <NumericInput
                    placeholder={placeholder}
                    min={minAllowedAmount}
                    max={maxAllowedAmount || 0}
                    step={isNaN(step) ? 0.01 : step}
                    name={name}
                    ref={amountRef}
                    precision={fromCurrency?.precision}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    className="text-primary-text pr-0 w-full"
                    onChange={e => {
                        /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                    }}
                >
                    {requestedAmountInUsd && Number(requestedAmountInUsd) > 0 && !isFocused ? (
                        <span className="absolute text-xs right-1 bottom-[16px]">
                            (${requestedAmountInUsd.toFixed(2)})
                        </span>
                    ) : null}
                </NumericInput>
            </div>
            {
                from && to && fromCurrency &&
                <MinMax />
            }
        </div >
    </>)
});

export default AmountField