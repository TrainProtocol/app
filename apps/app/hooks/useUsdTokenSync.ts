import { useCallback, useEffect, useRef } from "react";
import { useFormikContext } from "formik";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { resolveTokenUsdPrice } from "@/helpers/tokenHelper";
import { Token } from "@/Models/Network";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";

interface UseUsdTokenSyncArgs {
    side: 'source' | 'destination';
    token: Token | undefined;
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
}: UseUsdTokenSyncArgs): UseUsdTokenSyncReturn {
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const usdAmount = useUsdModeStore(s => s.usdAmount);
    const setUsdAmount = useUsdModeStore(s => s.setUsdAmount);
    const toggleMode = useUsdModeStore(s => s.toggleMode);
    const { values, setValues } = useFormikContext<SwapFormValues>();

    const tokenPriceInUsd = resolveTokenUsdPrice(token);

    const fieldName = side === 'source' ? 'amount' : 'receiveAmount';
    const oppositeField = side === 'source' ? 'receiveAmount' : 'amount';
    const isActiveSide = side === 'destination' ? !!values?.receiveAmount : !values?.receiveAmount;

    const prevPriceRef = useRef(tokenPriceInUsd);
    const prevTokenSymbolRef = useRef(token?.symbol);

    const computeAndSetTokenAmount = useCallback((usdValue: string) => {
        let newAmount: string;
        if (!usdValue) {
            newAmount = '';
        } else if (!tokenPriceInUsd || tokenPriceInUsd === 0) {
            newAmount = '0';
        } else {
            const usdNum = Number(usdValue);
            if (isNaN(usdNum) || usdNum <= 0) {
                newAmount = '0';
            } else {
                const precision = token?.decimals || 6;
                const tokenAmount = usdNum / tokenPriceInUsd;
                const truncated = Math.trunc(tokenAmount * Math.pow(10, precision)) / Math.pow(10, precision);
                newAmount = truncated.toString();
            }
        }
        setValues(prev => ({ ...prev, [fieldName]: newAmount, [oppositeField]: '' }), true);
    }, [tokenPriceInUsd, token?.decimals, setValues, fieldName, oppositeField]);

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
