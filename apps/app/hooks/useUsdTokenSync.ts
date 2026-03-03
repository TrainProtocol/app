import { useCallback, useEffect, useRef } from "react";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { Token } from "@/Models/Network";

let _skipNextSync = false;

export function skipNextUsdSync() {
    _skipNextSync = true;
}

interface UseUsdTokenSyncArgs {
    fromCurrency: Token | undefined;
    amount: string | undefined;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}

interface UseUsdTokenSyncReturn {
    sourceCurrencyPriceInUsd: number | undefined;
    isUsdMode: boolean;
    usdAmount: string;
    handleToggle: () => void;
    handleUsdInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useUsdTokenSync({
    fromCurrency,
    amount,
    setFieldValue,
}: UseUsdTokenSyncArgs): UseUsdTokenSyncReturn {
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const usdAmount = useUsdModeStore(s => s.usdAmount);
    const setUsdAmount = useUsdModeStore(s => s.setUsdAmount);
    const toggleMode = useUsdModeStore(s => s.toggleMode);

    const sourceCurrencyPriceInUsd = resolveTokenUsdPrice(fromCurrency);

    const prevPriceRef = useRef(sourceCurrencyPriceInUsd);
    const prevTokenSymbolRef = useRef(fromCurrency?.symbol);
    const internalAmountChangeRef = useRef(false);
    const currentAmountRef = useRef(amount);
    currentAmountRef.current = amount;
    const prevAmountRef = useRef(amount);

    const computeAndSetTokenAmount = useCallback((usdValue: string) => {
        let newAmount: string;
        if (!sourceCurrencyPriceInUsd || sourceCurrencyPriceInUsd === 0 || !usdValue) {
            newAmount = '';
        } else {
            const usdNum = Number(usdValue);
            if (isNaN(usdNum) || usdNum <= 0) {
                newAmount = '';
            } else {
                const precision = fromCurrency?.decimals || 6;
                const tokenAmount = usdNum / sourceCurrencyPriceInUsd;
                const truncated = Math.trunc(tokenAmount * Math.pow(10, precision)) / Math.pow(10, precision);
                newAmount = truncated.toString();
            }
        }
        if (newAmount !== (currentAmountRef.current || '')) {
            internalAmountChangeRef.current = true;
        }
        setFieldValue('amount', newAmount, true);
    }, [sourceCurrencyPriceInUsd, fromCurrency?.decimals, setFieldValue]);

    // Recompute token amount when price changes in USD mode
    useEffect(() => {
        if (!isUsdMode || !sourceCurrencyPriceInUsd || !usdAmount) {
            prevPriceRef.current = sourceCurrencyPriceInUsd;
            return;
        }
        if (prevPriceRef.current === sourceCurrencyPriceInUsd) return;
        prevPriceRef.current = sourceCurrencyPriceInUsd;
        computeAndSetTokenAmount(usdAmount);
    }, [sourceCurrencyPriceInUsd, isUsdMode, usdAmount, computeAndSetTokenAmount]);

    // Recompute token amount when source token changes in USD mode
    useEffect(() => {
        if (!isUsdMode || !sourceCurrencyPriceInUsd || !usdAmount) return;
        if (prevTokenSymbolRef.current === fromCurrency?.symbol) return;
        prevTokenSymbolRef.current = fromCurrency?.symbol;
        prevPriceRef.current = sourceCurrencyPriceInUsd;
        computeAndSetTokenAmount(usdAmount);
    }, [fromCurrency?.symbol, isUsdMode, sourceCurrencyPriceInUsd, usdAmount, computeAndSetTokenAmount]);

    // Sync usdAmount when formik amount changes externally (e.g. quick action buttons)
    useEffect(() => {
        const amountChanged = prevAmountRef.current !== amount;
        prevAmountRef.current = amount;

        const skipSync = _skipNextSync;
        if (skipSync) _skipNextSync = false;

        if (internalAmountChangeRef.current) {
            if (amountChanged) {
                internalAmountChangeRef.current = false;
            }
            return;
        }
        if (!amountChanged) return;
        if (skipSync) return;
        if (!isUsdMode || !sourceCurrencyPriceInUsd) return;

        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setUsdAmount('');
            return;
        }
        setUsdAmount((amountNum * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
    }, [amount, isUsdMode, sourceCurrencyPriceInUsd, setUsdAmount]);

    const handleToggle = useCallback(() => {
        if (!isUsdMode && sourceCurrencyPriceInUsd) {
            const amountNum = Number(amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                setUsdAmount((amountNum * sourceCurrencyPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
            } else {
                setUsdAmount('');
            }
        }
        toggleMode();
    }, [isUsdMode, amount, sourceCurrencyPriceInUsd, setUsdAmount, toggleMode]);

    const handleUsdInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(',', '.');
        if (value !== '' && !/^(0|[1-9]\d*)\.?\d{0,2}$/.test(value)) return;
        setUsdAmount(value);
        computeAndSetTokenAmount(value);
    }, [setUsdAmount, computeAndSetTokenAmount]);

    return {
        sourceCurrencyPriceInUsd,
        isUsdMode,
        usdAmount,
        handleToggle,
        handleUsdInputChange,
    };
}
