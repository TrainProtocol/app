import { SwapFormValues } from "../../DTOs/SwapFormValues";
import { useEffect, useRef } from "react";
import { truncateDecimals } from "../../utils/RoundDecimals";
import useSWRBalance from "../../../lib/balances/useSWRBalance";
import { useAtomicState } from "../../../context/atomicContext";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {

    const { to, fromCurrency, toCurrency, from, destination_address } = values
    const { selectedSourceAccount } = useAtomicState()
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balance, isBalanceLoading, isError } = useSWRBalance(address, network)
    const tokenBalance = balance?.find(b => b?.network === from?.name && b?.token === token?.symbol)
    const truncatedBalance = (tokenBalance?.amount && token) && truncateDecimals(tokenBalance?.amount, Math.min(token?.decimals, 8))

    const previouslySelectedSource = useRef(from);

    useEffect(() => {
        previouslySelectedSource.current = from
    }, [from, selectedSourceAccount?.address])

    const previouslySelectedDestination = useRef(to);

    useEffect(() => {
        previouslySelectedDestination.current = to
    }, [to, destination_address])

    if (isBalanceLoading)
        return <div className='h-[10px] w-10 inline-flex bg-gray-500 rounded-sm animate-pulse' />

    return (
        <>
            {
                (network && token && network) &&

                (truncatedBalance !== undefined && !isNaN(truncatedBalance)) &&
                <span>{truncatedBalance > 0 ? truncatedBalance.toFixed(Math.min(token?.decimals, 8)) : truncatedBalance}</span>
            }
        </>
    )
}

export default Balance