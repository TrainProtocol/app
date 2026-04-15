import { useCallback, useEffect, useRef } from "react";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { Token } from "@/Models/Network";
import type { QuoteDirection } from "@train-protocol/react";
import { useQuoteDirectionStore } from "@/stores/quoteDirectionStore";

let _skipNextSync = false;

export function skipNextUsdSync() {
    _skipNextSync = true;
}

interface UseUsdTokenSyncArgs {
    side: QuoteDirection;
    token: Token | undefined;
    amount: string | undefined;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}

interface UseUsdTokenSyncReturn {
    tokenPriceInUsd: number | undefined;
    isUsdMode: boolean;
    usdAmount: string;
    handleToggle: () => void;
    handleUsdInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useUsdTokenSync({
    side,
    token,
    amount,
    setFieldValue,
}: UseUsdTokenSyncArgs): UseUsdTokenSyncReturn {
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const usdAmount = useUsdModeStore(s => s.usdAmount);
    const setUsdAmount = useUsdModeStore(s => s.setUsdAmount);
    const toggleMode = useUsdModeStore(s => s.toggleMode);
    const quoteDirection = useQuoteDirectionStore(s => s.quoteDirection);
    const setQuoteDirection = useQuoteDirectionStore(s => s.setQuoteDirection);

    const tokenPriceInUsd = resolveTokenUsdPrice(token);

    const fieldName = side === 'source' ? 'amount' : 'receiveAmount';
    const isActiveSide = quoteDirection === side;

    const prevPriceRef = useRef(tokenPriceInUsd);
    const prevTokenSymbolRef = useRef(token?.symbol);
    const internalAmountChangeRef = useRef(false);
    const currentAmountRef = useRef(amount);
    currentAmountRef.current = amount;
    const prevAmountRef = useRef(amount);

    const computeAndSetTokenAmount = useCallback((usdValue: string) => {
        let newAmount: string;
        if (!tokenPriceInUsd || tokenPriceInUsd === 0 || !usdValue) {
            newAmount = '';
        } else {
            const usdNum = Number(usdValue);
            if (isNaN(usdNum) || usdNum <= 0) {
                newAmount = '';
            } else {
                const precision = token?.decimals || 6;
                const tokenAmount = usdNum / tokenPriceInUsd;
                const truncated = Math.trunc(tokenAmount * Math.pow(10, precision)) / Math.pow(10, precision);
                newAmount = truncated.toString();
            }
        }
        if (newAmount !== (currentAmountRef.current || '')) {
            internalAmountChangeRef.current = true;
        }
        setQuoteDirection(side);
        setFieldValue(fieldName, newAmount, true);
    }, [tokenPriceInUsd, token?.decimals, setFieldValue, fieldName, side, setQuoteDirection]);

    // Recompute token amount when price changes in USD mode (active side only)
    useEffect(() => {
        if (!isActiveSide || !isUsdMode || !tokenPriceInUsd || !usdAmount) {
            prevPriceRef.current = tokenPriceInUsd;
            return;
        }
        if (prevPriceRef.current === tokenPriceInUsd) return;
        prevPriceRef.current = tokenPriceInUsd;
        computeAndSetTokenAmount(usdAmount);
    }, [tokenPriceInUsd, isUsdMode, usdAmount, computeAndSetTokenAmount, isActiveSide]);

    // Recompute token amount when token changes in USD mode (active side only)
    useEffect(() => {
        if (!isActiveSide || !isUsdMode || !tokenPriceInUsd || !usdAmount) return;
        if (prevTokenSymbolRef.current === token?.symbol) return;
        prevTokenSymbolRef.current = token?.symbol;
        prevPriceRef.current = tokenPriceInUsd;
        computeAndSetTokenAmount(usdAmount);
    }, [token?.symbol, isUsdMode, tokenPriceInUsd, usdAmount, computeAndSetTokenAmount, isActiveSide]);

    // Sync usdAmount when formik amount changes externally (active side only)
    useEffect(() => {
        const amountChanged = prevAmountRef.current !== amount;
        prevAmountRef.current = amount;

        // Only the source side consumes the skip flag (set by source MinMax)
        const skipSync = side === 'source' && _skipNextSync;
        if (side === 'source' && _skipNextSync) _skipNextSync = false;

        if (internalAmountChangeRef.current) {
            if (amountChanged) {
                internalAmountChangeRef.current = false;
            }
            return;
        }
        if (!amountChanged) return;
        if (skipSync) return;
        if (!isActiveSide || !isUsdMode || !tokenPriceInUsd) return;

        const amountNum = Number(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            setUsdAmount('');
            return;
        }
        setUsdAmount((amountNum * tokenPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
    }, [amount, isUsdMode, tokenPriceInUsd, setUsdAmount, isActiveSide, side]);

    const handleToggle = useCallback(() => {
        if (!isUsdMode && tokenPriceInUsd) {
            const amountNum = Number(amount);
            if (!isNaN(amountNum) && amountNum > 0) {
                setUsdAmount((amountNum * tokenPriceInUsd).toFixed(2).replace(/\.?0+$/, ''));
            } else {
                setUsdAmount('');
            }
        }
        toggleMode();
    }, [isUsdMode, amount, tokenPriceInUsd, setUsdAmount, toggleMode]);

    const handleUsdInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(',', '.');
        if (value !== '' && !/^(0|[1-9]\d*)\.?\d{0,2}$/.test(value)) return;
        setUsdAmount(value);
        computeAndSetTokenAmount(value);
    }, [setUsdAmount, computeAndSetTokenAmount]);

    return {
        tokenPriceInUsd,
        isUsdMode,
        usdAmount,
        handleToggle,
        handleUsdInputChange,
    };
}
