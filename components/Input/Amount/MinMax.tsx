import { useFormikContext } from "formik";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import useSWRGas from "@/lib/gases/useSWRGas";
import { Token } from "@/Models/Network";
import { Network } from "@/Models/Network";
import React, { FC, useMemo } from "react";
import { resolveMaxAllowedAmount } from "./helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { useAtomicState } from "@/context/atomicContext";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import { getNativeToken } from "@/Models/Network";

type MinMaxProps = {
    fromCurrency: Token,
    from: Network,
    limitsMaxAmount: number | undefined,
    limitsMinAmount: number | undefined,
    onActionHover: (value: number | undefined) => void,
}

const MinMax = (props: MinMaxProps) => {

    const { setFieldValue, values } = useFormikContext<SwapFormValues>();
    const { fromCurrency, from, limitsMinAmount, limitsMaxAmount, onActionHover } = props;

    const { selectedSourceAccount } = useAtomicState();
    const { gas } = useSWRGas(selectedSourceAccount?.address, from, fromCurrency)
    const { balance, mutate: mutateBalances } = useSWRBalance(selectedSourceAccount?.address, from)

    const walletBalance = useMemo(() => {
        return selectedSourceAccount?.address ? balance?.find(b => b?.network === from?.slug && b?.token === fromCurrency?.symbol) : undefined
    }, [selectedSourceAccount?.address, balance, from?.slug, fromCurrency?.symbol])

    const gasAmount = gas || 0;

    const native_currency = getNativeToken(from)

    const shouldPayGasWithTheToken = (native_currency?.symbol === fromCurrency?.symbol) || !native_currency

    const fallbackAmount = useMemo(() => {
        return fromCurrency.priceInUsd && fromCurrency.priceInUsd > 0 ? 0.01 / fromCurrency.priceInUsd : 0.01;
    }, [fromCurrency.priceInUsd]);

    let maxAllowedAmount: number = useMemo(() => {
        return resolveMaxAllowedAmount({ fromCurrency, limitsMaxAmount, walletBalance, gasAmount, native_currency, depositMethod: 'wallet', fallbackAmount }) || 0;
    }, [fromCurrency, limitsMinAmount, limitsMaxAmount, walletBalance, gasAmount, native_currency, fallbackAmount])

    const minAmount = useMemo(() => {
        if (walletBalance && walletBalance.amount !== undefined && limitsMinAmount !== undefined) {
            return Number(walletBalance.amount) < limitsMinAmount ? Number(walletBalance.amount) : limitsMinAmount;
        }
        return limitsMinAmount || fallbackAmount;
    }, [walletBalance, limitsMinAmount, fallbackAmount]);

    const halfOfBalance = (walletBalance?.amount || maxAllowedAmount) ? (walletBalance?.amount || maxAllowedAmount) / 2 : 0;

    const handleSetValue = (value: string) => {
        mutateBalances()
        setFieldValue('amount', value, true)
        onActionHover(undefined)
    }

    const handleSetMinAmount = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(minAmount.toString())
    }

    const handleSetHalfAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(halfOfBalance.toString())
    }

    const handleSetMaxAmount = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        handleSetValue(maxAllowedAmount.toString())
    }

    const showMaxTooltip = !!(walletBalance?.amount && shouldPayGasWithTheToken && (!limitsMaxAmount || walletBalance.amount < limitsMaxAmount))

    if (!from || !fromCurrency || !balance)
        return null;

    return (
        <div className="flex gap-1.5 group text-xs leading-4" onMouseLeave={() => onActionHover(undefined)}>
            {/* <ActionButton
                data-attr="min-amount"
                label="Min"
                onMouseEnter={() => onActionHover(minAmount)}
                onClick={handleSetMinAmount}
            /> */}
            <ActionButton
                data-attr="half-amount"
                label="50%"
                onMouseEnter={() => onActionHover(halfOfBalance)}
                onClick={handleSetHalfAmount}
            />
            <Tooltip disableHoverableContent={true}>
                <TooltipTrigger asChild>
                    <ActionButton
                        data-attr="max-amount"
                        label="Max"
                        onMouseEnter={() => onActionHover(maxAllowedAmount)}
                        onClick={handleSetMaxAmount}
                    />
                </TooltipTrigger>
                {showMaxTooltip ? <TooltipContent className="pointer-events-none w-80 grow p-2 border-none! bg-secondary-300! text-xs rounded-xl!" side="top" align="start" alignOffset={-10}>
                    <p>Max is calculated based on your balance minus gas fee for the transaction</p>
                </TooltipContent> : null}
            </Tooltip>
        </div>
    )
}

export default MinMax

type ActionButtonProps = React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
    label: string;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMouseEnter: () => void;
    disabled?: boolean;
}

const ActionButton: FC<ActionButtonProps> = ({ label, onClick, onMouseEnter, disabled, ...rest }) => {
    return (
        <button
            {...rest}
            onMouseEnter={onMouseEnter}
            onClick={onClick}
            typeof="button"
            type="button"
            disabled={disabled}
            className="px-1.5 py-0.5 rounded-md duration-200 break-keep transition bg-secondary-400 hover:bg-secondary-500 text-secondary-text hover:text-primary-text cursor-pointer enabled:active:animate-press-down"
        >
            {label}
        </button>
    );
}
