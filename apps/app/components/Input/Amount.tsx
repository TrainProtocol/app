import { useFormikContext } from "formik";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import NumericInput from "./NumericInput";
import { formatUsd } from "@/apps/app/components/utils/formatUsdAmount";
import clsx from "clsx";
import { resolveTokenUsdPrice } from "@/apps/app/helpers/tokenHelper";
import { SwapQuote } from "@/apps/app/lib/trainApiClient";

interface AmountFieldProps {
    usdPosition?: "right" | "bottom";
    fee: SwapQuote | undefined;
    actionValue?: number;
    className?: string;
}

const AmountField = forwardRef(function AmountField({ usdPosition = "bottom", actionValue, fee, className }: AmountFieldProps, ref: any) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const { fromCurrency, amount } = values || {};
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLDivElement>(null);

    const sourceCurrencyPriceInUsd = resolveTokenUsdPrice(fromCurrency)

    const requestedAmountInUsd = useMemo(() => {
        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0 || !sourceCurrencyPriceInUsd)
            return undefined;
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber)
    }, [amount, sourceCurrencyPriceInUsd]);

    const actionValueInUsd = useMemo(() => {
        const amountNumber = Number(actionValue);
        if (isNaN(amountNumber) || amountNumber <= 0 || !sourceCurrencyPriceInUsd)
            return undefined;
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber)
    }, [actionValue, sourceCurrencyPriceInUsd]);

    useEffect(() => {
        const input = amountRef.current;
        const suffix = suffixRef.current;

        if (!input || !suffix) return;

        const font = getFontFromElement(input);
        const width = getTextWidth(actionValue?.toString() || amount || "0", font);
        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd, actionValue]);

    const placeholder = '0'

    const step = 1 / Math.pow(10, fromCurrency?.decimals || 1)

    return (
        <div className={clsx("flex flex-col bg-secondary-700 space-y-0.5 relative w-full group",
            className,
            {
                'focus-within:[&_.usd-suffix]:invisible': usdPosition === "right"
            }
        )}
        >
            <NumericInput
                placeholder={placeholder}
                step={isNaN(step) ? 0.01 : step}
                name={name}
                ref={amountRef}
                precision={fromCurrency?.decimals}
                tempValue={actionValue}
                className="w-full text-[28px] leading-[34px] rounded-xl text-primary-text focus:outline-none focus:border-none focus:ring-0 duration-300 ease-in-out bg-secondary-700! font-normal! px-0 truncate"
                onChange={e => {
                    /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                }}
            />
            <div className={clsx(
                "usd-suffix text-base leading-5 font-medium text-secondary-text pointer-events-none",
                {
                    "absolute bottom-3": usdPosition === "right",
                    "h-5": usdPosition !== "right",
                    "text-secondary-text/45": !!actionValueInUsd
                },
                "group-hover:block"
            )} ref={suffixRef}>
                {`${actionValueInUsd ?? requestedAmountInUsd ?? '$0'}`}
            </div>
        </div>
    )
});

export default AmountField

function getTextWidth(text: string = '', font: string): number {
    if (typeof document === "undefined") return 0;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return 0;

    context.font = font;
    return context.measureText(text).width;
}

function getFontFromElement(el: HTMLElement | null): string {
    if (!el) return '28px sans-serif';
    const style = window.getComputedStyle(el);
    return `${style.fontSize} ${style.fontFamily}`;
}
