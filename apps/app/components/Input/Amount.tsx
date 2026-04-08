import { useFormikContext } from "formik";
import { Input } from "@/components/shadcn/input";
import { forwardRef, useEffect, useMemo, useRef } from "react";
import { SwapFormValues } from "../DTOs/SwapFormValues";
import NumericInput from "./NumericInput";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import clsx from "clsx";
import { useUsdTokenSync } from "@/hooks/useUsdTokenSync";
import { ArrowUpDown } from "lucide-react";

interface AmountFieldProps {
    fee: unknown;
    actionValue?: number;
    actionValueUsd?: string;
    className?: string;
    showToggle?: boolean;
}

const AmountField = forwardRef(function AmountField({ actionValue, actionValueUsd, className, showToggle }: AmountFieldProps, ref: any) {
    const { values, handleChange } = useFormikContext<SwapFormValues>();
    const { fromCurrency, amount } = values || {};
    const { setFieldValue } = useFormikContext<SwapFormValues>();
    const name = "amount"
    const amountRef = useRef(ref)
    const suffixRef = useRef<HTMLDivElement>(null);

    const { sourceCurrencyPriceInUsd, isUsdMode, usdAmount, handleToggle, handleUsdInputChange, } = useUsdTokenSync({ fromCurrency, amount, setFieldValue, });

    // --- Token mode display computations ---

    const requestedAmountInUsd = useMemo(() => {
        const amountNumber = Number(amount);
        if (isNaN(amountNumber) || amountNumber <= 0 || !sourceCurrencyPriceInUsd)
            return undefined;
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber)
    }, [amount, sourceCurrencyPriceInUsd]);

    const actionValueInUsd = useMemo(() => {
        const amountNumber = Number(actionValue);
        if (isNaN(amountNumber) || amountNumber <= 0)
            return undefined;
        if (actionValueUsd) return formatUsd(Number(actionValueUsd));
        if (!sourceCurrencyPriceInUsd) return undefined;
        return formatUsd(sourceCurrencyPriceInUsd * amountNumber)
    }, [actionValue, actionValueUsd, sourceCurrencyPriceInUsd]);

    // --- USD mode display computations ---

    const actionValueAsUsd = useMemo(() => {
        if (actionValue === undefined || actionValue <= 0)
            return undefined;
        if (actionValueUsd) return actionValueUsd;
        if (!sourceCurrencyPriceInUsd) return undefined;
        return (actionValue * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, '');
    }, [actionValue, actionValueUsd, sourceCurrencyPriceInUsd]);

    const actionValueAsToken = useMemo(() => {
        if (actionValue === undefined || actionValue <= 0) return undefined;
        const precision = fromCurrency?.decimals || 6;
        return formatTokenAmount(actionValue, precision);
    }, [actionValue, fromCurrency?.decimals]);

    const formattedTokenAmount = useMemo(() => {
        const num = Number(amount);
        if (isNaN(num) || num <= 0) return '0';
        const precision = fromCurrency?.decimals || 6;
        return formatTokenAmount(num, precision);
    }, [amount, fromCurrency?.decimals]);

    // --- Suffix positioning for token mode ---

    useEffect(() => {
        if (isUsdMode) return;
        const input = amountRef.current;
        const suffix = suffixRef.current;
        if (!input || !suffix) return;
        const font = getFontFromElement(input);
        const width = getTextWidth(actionValue?.toString() || amount || "0", font);
        suffix.style.left = `${width + 16}px`;
    }, [amount, requestedAmountInUsd, actionValue, isUsdMode]);

    const placeholder = '0'
    const step = 1 / Math.pow(10, fromCurrency?.decimals || 1)
    const canToggle = !!sourceCurrencyPriceInUsd;

    const toggleButton = canToggle ? (
        <button
            type="button"
            onClick={handleToggle}
            className={clsx(
                "inline-flex items-center p-0.5 rounded-md bg-secondary-400 hover:brightness-90 text-secondary-text hover:text-primary-text transition cursor-pointer pointer-events-auto",
                !showToggle && "hidden group-hover/source:inline-flex"
            )}
        >
            <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
    ) : null;

    // --- USD mode render ---

    if (isUsdMode) {
        const previewUsd = actionValueAsUsd;
        const previewToken = actionValueAsToken;

        return (
            <div className={clsx("flex flex-col bg-secondary-500 space-y-0.5 relative w-full", className)}>
                <div className="flex items-center h-12">
                    <span className="text-[28px] leading-[34px] text-primary-text font-normal mr-1 select-none">$</span>
                    <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="0"
                        value={previewUsd ?? usdAmount}
                        onChange={handleUsdInputChange}
                        className={clsx(
                            "text-[28px] leading-[34px] focus-visible:ring-0 focus-visible:border-transparent font-normal px-0 truncate bg-secondary-500 border-0",
                            previewUsd ? "text-secondary-text/45" : "text-primary-text",
                            "placeholder:text-secondary-text"
                        )}
                    />
                </div>
                <div className="flex items-center gap-1 text-base leading-5 font-medium text-secondary-text h-5 min-w-0">
                    {toggleButton}
                    <span className={clsx("flex items-center min-w-0 space-x-1", { "text-secondary-text/45": !!previewToken })}>
                        <span className="truncate min-w-0">
                            {`${previewToken ?? formattedTokenAmount}`}
                        </span>
                        <span className="shrink-0">
                            {` ${fromCurrency?.symbol || ''}`}
                        </span>
                    </span>
                </div>
            </div>
        );
    }

    // --- Token mode render (default) ---

    return (
        <div className={clsx("flex flex-col bg-secondary-500 space-y-0.5 relative w-full group", className)}>
            <NumericInput
                placeholder={placeholder}
                step={isNaN(step) ? 0.01 : step}
                name={name}
                ref={amountRef}
                precision={fromCurrency?.decimals}
                tempValue={actionValue}
                className="text-[28px] leading-[34px] rounded-xl text-primary-text focus-visible:ring-0 focus-visible:border-transparent bg-secondary-500! font-normal! px-0 truncate"
                onChange={e => {
                    /^[0-9]*[.,]?[0-9]*$/.test(e.target.value) && handleChange(e);
                }}
            />
            <div className={clsx(
                "usd-suffix text-base leading-5 font-medium text-secondary-text pointer-events-none h-5 flex items-center gap-1",
                {
                    "text-secondary-text/45": !!actionValueInUsd
                },
                "group-hover:flex"
            )} ref={suffixRef}>
                {toggleButton}
                <span>{`${actionValueInUsd ?? requestedAmountInUsd ?? '$0'}`}</span>
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

function formatTokenAmount(value: number, precision: number): string {
    const fixed = value.toFixed(precision).replace(/\.?0+$/, '');
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = Number(intPart).toLocaleString('en-US');
    return decPart ? `${formattedInt}.${decPart}` : formattedInt;
}
