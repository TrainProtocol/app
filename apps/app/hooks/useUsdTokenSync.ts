import { useCallback, useEffect, useRef } from "react";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { Token } from "@/Models/Network";
import type { QuoteDirection } from "@train-protocol/react";
import { useQuoteDirectionStore } from "@/stores/quoteDirectionStore";

interface UseUsdTokenSyncArgs {
    side: QuoteDirection;
    token: Token | undefined;
    setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void;
}

interface UseUsdTokenSyncReturn {
    tokenPriceInUsd: number | undefined;
    isUsdMode: boolean;
    usdAmount: string;
    toggleMode: () => void;
    handleUsdInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useUsdTokenSync({
    side,
    token,
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
        toggleMode,
        handleUsdInputChange,
    };
}
