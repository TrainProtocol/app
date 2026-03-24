import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { Info } from "lucide-react";
import { useSelectedAccount } from "@/context/swapAccounts";
import { useBalance } from "@/lib/balances/useBalance";
import { FC } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip";
import { useUsdModeStore } from "@/stores/usdModeStore";
import { formatUsd } from "@/components/utils/formatUsdAmount";

const Balance = ({ values, direction }: { values: SwapFormValues, direction: string }) => {
    const { to, fromCurrency, toCurrency, from, destination_address } = values
    const selectedSourceAccount = useSelectedAccount("from", from?.caip2Id);
    const isUsdMode = useUsdModeStore(s => s.isUsdMode);
    const token = direction === 'from' ? fromCurrency : toCurrency
    const network = direction === 'from' ? from : to
    const address = direction === 'from' ? selectedSourceAccount?.address : destination_address
    const { balances, isLoading } = useBalance(address, network, { refreshInterval: 20000, dedupeInterval: 20000 })
    const tokenBalance = balances?.find(
        b => b?.network === network?.caip2Id && b?.token === token?.symbol
    )
    const balanceAmount = Number(tokenBalance?.amount)
    const truncatedBalance = tokenBalance?.amount !== undefined ? truncateDecimals(tokenBalance?.amount, Math.min(token?.decimals ?? 8, 8)) : ''
    const tokenPriceInUsd = token?.priceInUsd
    const balanceInUsd = isUsdMode && typeof tokenPriceInUsd === 'number' && tokenPriceInUsd > 0 && !isNaN(balanceAmount)
        ? formatUsd(balanceAmount * tokenPriceInUsd)
        : undefined
    const displayedBalance = balanceInUsd ?? truncatedBalance

    if (!isLoading && !(network && token && tokenBalance))
        return null;

    return <div className="min-w-4/5 -top-px p-1 mx-2 relative rounded-b-lg text-center bg-secondary-200 py-0.5 text-xs text-secondary-text leading-[18px] font-normal">
        {
            isLoading ?
                <div className='h-[10px] w-fit px-4 inline-flex bg-gray-500 rounded-xs animate-pulse' />
                : !displayedBalance ?
                    <span>-</span>
                    : (network && token && displayedBalance) ?
                        ((balanceAmount >= 0 && balanceAmount < Number(values.amount) && direction === 'from') ?
                            <InsufficientBalance balance={displayedBalance} />
                            :
                            <span>{displayedBalance}</span>
                        )
                        : null
        }
    </div>
}

const InsufficientBalance: FC<{ balance: string }> = ({ balance }) => {
    return <Tooltip>
        <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-amber-400 justify-center cursor-default">
                <Info className='w-3 h-3' />
                <p>{balance}</p>
            </div>
        </TooltipTrigger>
        <TooltipContent className="!bg-secondary-400 !border-0 !p-3 !rounded-xl">
            <div className="flex items-center gap-2 justify-center">
                <Info className='w-4 h-4 text-amber-400' />
                <p className="text-sm">Insufficient balance</p>
            </div>
        </TooltipContent>
    </Tooltip>
}

export default Balance
