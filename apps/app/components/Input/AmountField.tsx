import { useFormikContext } from "formik";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import NumberFlow from "@number-flow/react";
import { ArrowUpDown } from "lucide-react";
import { Input } from "@/components/shadcn/input";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { useUsdTokenSync } from "@/hooks/useUsdTokenSync";
import { isScientific } from "@layerswap/utils";
import type { SwapQuote } from "@train-protocol/react";
import { formatUnits } from "@layerswap/utils";
import { captureEvent } from "@/lib/faro";

// Caps on significant digits shown in NumberFlow. Above the cap, render `...` to indicate truncation.
const PRIMARY_MAX_SIG_DIGITS = 10;
const SECONDARY_MAX_SIG_DIGITS = 11;

interface AmountFieldProps {
    side: 'source' | 'destination';
    actionValue?: number;
    actionValueUsd?: string;
    className?: string;
    showToggle?: boolean;
    isQuoteLoading?: boolean;
    quote?: SwapQuote;
}

const AmountField = ({ side, actionValue, actionValueUsd, className, showToggle, isQuoteLoading, quote }: AmountFieldProps) => {
    const { values, setValues } = useFormikContext<SwapFormValues>();

    const fieldName: 'amount' | 'receiveAmount' = side === 'source' ? 'amount' : 'receiveAmount';
    const oppositeField: 'amount' | 'receiveAmount' = side === 'source' ? 'receiveAmount' : 'amount';
    const quoteDirection: 'source' | 'destination' = values?.receiveAmount ? 'destination' : 'source';
    const token = side === 'source' ? values?.fromCurrency : values?.toCurrency;
    const quoteAmount = side === 'source' ? quote?.amount : quote?.receiveAmount;
    const quoteDerivedAmount = quoteAmount && token?.decimals != null ? formatUnits(BigInt(quoteAmount), token.decimals) : '';


    const stableDerivedAmountRef = useRef(quoteDerivedAmount);
    if (!isQuoteLoading) stableDerivedAmountRef.current = quoteDerivedAmount;

    const currentAmount = quoteDirection === side
        ? (values?.[fieldName] ?? '')
        : (isQuoteLoading ? stableDerivedAmountRef.current : quoteDerivedAmount);

    const amountRef = useRef<HTMLInputElement>(null);
    const suffixRef = useRef<HTMLDivElement>(null);

    const { tokenPriceInUsd, isUsdMode, usdAmount, toggleMode, handleUsdInputChange, } = useUsdTokenSync({ side, token });

    const [inputFocused, setInputFocused] = useState(false);
    const amountTrackedRef = useRef(false);
    const handleTokenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = sanitizeDecimalInput(e.target.value, token?.decimals);
        if (v === null) return;
        if (v && !amountTrackedRef.current) {
            amountTrackedRef.current = true;
            captureEvent('amount_entered', { side });
        }
        setValues(prev => ({ ...prev, [fieldName]: v, [oppositeField]: '' }), true);
    }, [setValues, token?.decimals, fieldName, oppositeField, side]);

    const handleFocus = useCallback(() => {
        setInputFocused(true);
    }, []);


    const tokenNum = (() => { const n = Number(currentAmount); return isNaN(n) ? 0 : n; })();
    const usdValue = tokenPriceInUsd && tokenNum > 0 ? tokenNum * tokenPriceInUsd : 0;
    const precision = token?.decimals || 6;
    const actionValueAsUsd = actionValue !== undefined && actionValue > 0
        ? (actionValueUsd ?? (tokenPriceInUsd ? (actionValue * tokenPriceInUsd).toFixed(2).replace(/\.?0+$/, '') : undefined))
        : undefined;

    const actionValueAsToken = actionValue !== undefined && actionValue > 0 ? formatTokenAmount(actionValue, precision) : undefined;

    const formattedActionTokenValue = actionValue === undefined || actionValue < 0 ? ''
        : isScientific(actionValue) ? actionValue.toFixed(token?.decimals ?? 0).replace(/\.?0+$/, '')
            : actionValue.toString();

    const showActionPreview = actionValue !== undefined && !isNaN(Number(actionValue));

    useEffect(() => {
        if (isUsdMode) return;
        const input = amountRef.current;
        const suffix = suffixRef.current;
        if (!input || !suffix) return;
        const font = getFontFromElement(input);
        const width = getTextWidth(actionValue?.toString() || currentAmount || '0', font);
        suffix.style.left = `${width + 16}px`;
    }, [currentAmount, actionValue, isUsdMode, amountRef]);

    const step = 1 / Math.pow(10, token?.decimals || 1);

    const onTogglePress = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        amountRef.current?.blur();
        toggleMode();
    }, [toggleMode]);

    const toggleButton = side === 'source' && tokenPriceInUsd ? (
        <button
            type="button"
            onClick={onTogglePress}
            className={clsx(
                "inline-flex items-center p-0.5 rounded-md bg-secondary-400 hover:brightness-90 text-secondary-text hover:text-primary-text transition cursor-pointer pointer-events-auto",
                !showToggle && "hidden group-hover/source:inline-flex",
            )}
        >
            <ArrowUpDown className="w-3.5 h-3.5" />
        </button>
    ) : null;

    const handleWrapperClick = useCallback(() => {
        amountRef.current?.focus();
    }, []);


    const localUsdString = tokenPriceInUsd && tokenNum > 0 ? (tokenNum * tokenPriceInUsd).toFixed(2).replace(/\.?0+$/, '') : '';

    const inputValue = isUsdMode
        ? (actionValueAsUsd ?? (quoteDirection === side && usdAmount ? usdAmount : localUsdString))
        : (currentAmount ?? '');
    const inputOnChange = isUsdMode ? handleUsdInputChange : handleTokenChange;

    const isPrimaryTruncated = tokenNum > 0 && isFinite(tokenNum) && Number(tokenNum.toPrecision(PRIMARY_MAX_SIG_DIGITS)) !== tokenNum;
    const isSecondaryTruncated = tokenNum > 0 && isFinite(tokenNum) && Number(tokenNum.toPrecision(SECONDARY_MAX_SIG_DIGITS)) !== tokenNum;

    const showOverlay = isUsdMode ? !inputFocused && !actionValueAsUsd : !inputFocused && !showActionPreview;
    const hideInput = showOverlay || (showActionPreview && !isUsdMode);
    const overlayValue = isUsdMode ? usdValue : tokenNum;
    const overlayFormat = isUsdMode ? { minimumFractionDigits: 0, maximumFractionDigits: 2 } : { maximumSignificantDigits: PRIMARY_MAX_SIG_DIGITS };
    const hasValue = hideInput ? overlayValue > 0 : !!inputValue;
    const textColor = hasValue ? "text-primary-text" : "text-secondary-text";

    return (
        <div
            className={clsx("flex flex-col space-y-0.5 relative w-full cursor-text", side === 'source' && 'group/source', className)}
            onClick={handleWrapperClick}
        >
            <div className="relative flex items-center h-12">
                {isUsdMode && (
                    <span className={clsx("text-[28px] leading-[34px] font-normal mr-1 select-none", textColor, !inputFocused && isQuoteLoading && "animate-pulse-stronger",)}>$</span>
                )}
                <div className="w-full flex items-center py-[3px] relative">
                    <Input
                        ref={amountRef}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="0"
                        step={!isUsdMode ? (isNaN(step) ? 0.01 : step) : undefined}
                        value={inputValue}
                        onChange={inputOnChange}
                        onFocus={handleFocus}
                        onBlur={() => setInputFocused(false)}
                        className={clsx(
                            "text-[28px] leading-[34px] focus-visible:ring-0 focus-visible:border-transparent font-normal px-0 truncate bg-secondary-500 border-0 placeholder:text-secondary-text text-primary-text transition-none [font-kerning:none] [font-variant-ligatures:none]",
                            hideInput && "text-transparent placeholder:text-transparent",
                            !inputFocused && isQuoteLoading && "animate-pulse-stronger",
                        )}
                    />
                    {!isUsdMode && showActionPreview && (
                        <span className="absolute inset-0 flex items-center py-[3px] pr-3 text-[28px] leading-[34px] font-normal text-secondary-text/45 pointer-events-none truncate [font-kerning:none] [font-variant-ligatures:none]">
                            {formattedActionTokenValue}
                        </span>
                    )}
                    <span className={clsx(
                        "absolute inset-0 flex items-center py-[3px] pr-3 text-[28px] leading-[34px] font-normal pointer-events-none [font-kerning:none] [font-variant-ligatures:none]",
                        showOverlay ? textColor : "invisible",
                        showOverlay && isQuoteLoading && "animate-pulse-stronger",
                    )}>
                        <NumberFlow value={overlayValue} format={overlayFormat} trend={0} />
                        {!isUsdMode && isPrimaryTruncated && <span className="shrink-0">...</span>}
                    </span>
                </div>
            </div>

            <div
                ref={!isUsdMode ? suffixRef : undefined}
                className={clsx(
                    "text-base leading-5 font-medium text-secondary-text h-5 flex items-center gap-1 min-w-0 [font-kerning:none] [font-variant-ligatures:none]",
                    !isUsdMode && "usd-suffix",
                    !isUsdMode && { "text-secondary-text/45": !!actionValueAsUsd },
                )}
            >
                {toggleButton}
                {isUsdMode ? (
                    <span className={clsx("flex items-center min-w-0 space-x-1", actionValueAsToken && "text-secondary-text/45")}>
                        {actionValueAsToken ? (
                            <span className="truncate min-w-0">{actionValueAsToken}</span>
                        ) : (
                            <span className="flex items-center">
                                <NumberFlow
                                    className="p-0"
                                    value={tokenNum}
                                    format={{ maximumSignificantDigits: SECONDARY_MAX_SIG_DIGITS }}
                                    trend={0}
                                />
                                {isSecondaryTruncated && <span className="shrink-0">...</span>}
                            </span>
                        )}
                        <span className="shrink-0">{` ${token?.symbol || ''}`}</span>
                    </span>
                ) : (
                    actionValueAsUsd ? (
                        <span>{`$${actionValueAsUsd}`}</span>
                    ) : (
                        <NumberFlow className="p-0" value={usdValue} prefix="$" format={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} trend={0} />
                    )
                )}
            </div>
        </div>
    );
};

export default AmountField;

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

function sanitizeDecimalInput(raw: string, maxDecimals?: number): string | null {
    const v = raw.replace(',', '.');
    if (v !== '' && !/^[0-9]*[.,]?[0-9]*$/.test(v)) return null;
    if (maxDecimals != null && v.includes('.')) {
        const [whole, decs = ''] = v.split('.');
        if (decs.length > maxDecimals) {
            return maxDecimals === 0 ? whole : `${whole}.${decs.slice(0, maxDecimals)}`;
        }
    }
    return v;
}
