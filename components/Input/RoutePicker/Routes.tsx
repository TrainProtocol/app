import { Network, Token } from "@/Models/Network";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import { ChevronDown } from "lucide-react";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { useBalance } from "@/lib/balances/useBalance";
import { useSwapAccounts } from "@/context/swapAccounts";
import { memo, useMemo } from "react";
import { RowElement } from "@/Models/Route";
import { resolveTokenLogoUrl } from "@/components/utils/resolveTokenLogoUrl";
import { formatUsd } from "@/components/utils/formatUsdAmount";
import { getTotalBalanceInUSD } from "@/helpers/balanceHelper";

type TokenItemProps = {
    network: Network;
    item: Token;
    type?: RowElement['type'];
    selected: boolean;
    direction: SwapDirection;
};

export const CurrencySelectItemDisplay = memo((props: TokenItemProps) => {
    const { item, network, direction } = props

    return <SelectItem className="group">
        <SelectItem.Logo
            imgSrc={item.logo || resolveTokenLogoUrl(item.symbol)}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        <NetworkTokenTitle item={item} network={network} direction={direction} />
    </SelectItem>
});

CurrencySelectItemDisplay.displayName = 'CurrencySelectItemDisplay';

type NetworkTokenItemProps = {
    network: Network;
    item: Token;
    direction: SwapDirection;
}

export const NetworkTokenTitle = (props: NetworkTokenItemProps) => {
    const { item, network, direction } = props
    const swapAccounts = useSwapAccounts(direction)
    const selectedAccount = swapAccounts.find(w =>
        (direction === 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(network?.caip2Id)
    )
    const address = selectedAccount?.address;
    const { balances } = useBalance(address, network);

    const tokenBalance = balances?.find(b => b.token === item.symbol);
    const formatted_balance_amount = (tokenBalance?.amount || tokenBalance?.amount === 0)
        ? truncateDecimals(tokenBalance?.amount, Math.min(item.decimals, 8))
        : '';
    const usdAmount = (tokenBalance?.amount && item?.priceInUsd) ? item?.priceInUsd * tokenBalance?.amount : undefined;

    return <SelectItem.DetailedTitle
        title={
            <div className="flex items-center justify-between w-full gap-2">
                <span className="font-medium">{item.symbol}</span>
                {(tokenBalance && Number(tokenBalance?.amount) > 0 && Number(usdAmount) > 0) && (
                    <div className="text-primary-text text-lg leading-[22px] font-medium">{formatUsd(usdAmount)}</div>
                )}
            </div>
        }
        secondaryImageAlt={network.displayName}
        secondary={
            <div className="flex items-center gap-1">
                <span className="truncate">{network.displayName}</span>
            </div>
        }
        secondaryLogoSrc={network.logo}
    >
        {(tokenBalance && Number(tokenBalance?.amount) > 0) ? (
            <span className="text-sm text-secondary-text text-right my-auto font-medium block">
                <div className='text-xs leading-4 truncate'>
                    {formatted_balance_amount}
                </div>
            </span>
        ) : <></>}
    </SelectItem.DetailedTitle>
}

type NetworkItemProps = {
    item: Network;
    selected: boolean;
    direction: SwapDirection;
}

export const NetworkRouteSelectItemDisplay = (props: NetworkItemProps) => {
    const { item, direction } = props
    const swapAccounts = useSwapAccounts(direction)
    const selectedAccount = swapAccounts.find(w => (direction === 'from' ? w.provider?.withdrawalSupportedNetworks : w.provider?.autofillSupportedNetworks)?.includes(item.caip2Id))
    const address = selectedAccount?.address;

    const networkBalances = useBalance(address, item)
    const totalInUSD = useMemo(() => getTotalBalanceInUSD(networkBalances, item), [networkBalances.balances, item])

    const tokensWithBalance = networkBalances.balances?.filter(b => b.amount && b.amount > 0).map(b => b.token);
    const filteredNetworkTokens = item.tokens?.filter(t => tokensWithBalance?.includes(t.symbol));

    const hasLoadedBalances = totalInUSD !== null && totalInUSD > 0;
    const showTokenLogos = hasLoadedBalances && filteredNetworkTokens?.length;

    return (
        <SelectItem className="accordion-item-focused bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative pr-7 py-2 ring-hidden">
            <SelectItem.Logo imgSrc={item.logo} altText={`${item.displayName} logo`} className="rounded-md" />
            <SelectItem.Title>
                <>
                    <span>
                        {item.displayName}
                    </span>

                    {hasLoadedBalances ? (
                        <div className={showTokenLogos ? "flex flex-col space-y-0.5" : ""}>
                            <span className="text-secondary-text text-sm leading-4 font-medium">
                                {formatUsd(totalInUSD)}
                            </span>
                            {showTokenLogos ? (
                                <div className="flex justify-end items-center -space-x-2 relative h-4">
                                    {filteredNetworkTokens.slice(0, 3).map((t, index) => (
                                        <ImageWithFallback
                                            key={`${t.symbol}-${index}`}
                                            src={t.logo || resolveTokenLogoUrl(t.symbol)}
                                            alt={`${t.symbol} logo`}
                                            height="16"
                                            width="16"
                                            loading="eager"
                                            fetchPriority="high"
                                            className="rounded-full object-contain"
                                        />
                                    ))}
                                    {filteredNetworkTokens.length > 3 && (
                                        <div className="w-4 h-4 bg-secondary-600 text-primary-text text-[8px] rounded-full flex items-center justify-center border-2 border-background">
                                            <span>+{filteredNetworkTokens.length - 3}</span>
                                        </div>
                                    )}
                                </div>
                            ) : <></>}
                        </div>
                    ) : <></>}

                    <ChevronDown
                        className="w-3.5! h-3.5! absolute right-2 top-1/2 -translate-y-1/2 text-secondary-text transition-opacity duration-200 opacity-0 group-hover/item:opacity-100"
                        aria-hidden="true"
                    />
                </>
            </SelectItem.Title>
        </SelectItem>
    );
};

type SelectedRouteDisplayProps = {
    network?: Network;
    token?: Token;
    placeholder: string;
}

export const SelectedRouteDisplay = ({ network, token, placeholder }: SelectedRouteDisplayProps) => {
    const showContent = token && network;

    return (
        <span className="flex grow text-left items-center text-xs md:text-base relative">
            {showContent ? (
                <>
                    <div className="inline-flex items-center relative shrink-0 h-7 w-7">
                        <div className="h-6 w-6">
                            <ImageWithFallback
                                src={token.logo || resolveTokenLogoUrl(token.symbol)}
                                alt="Token Logo"
                                height="24"
                                width="24"
                                loading="eager"
                                fetchPriority="high"
                                className="rounded-full object-contain"
                            />
                        </div>
                        <div className="absolute left-[13px] top-3.5 h-4 w-4 rounded border border-secondary-500 bg-secondary-400 overflow-hidden">
                            <ImageWithFallback
                                src={network.logo || ''}
                                alt="Network Logo"
                                height="14"
                                width="14"
                                loading="eager"
                                fetchPriority="high"
                                className="object-contain"
                            />
                        </div>
                    </div>
                    <div className="ml-2 flex flex-col grow text-primary-text overflow-hidden min-w-0 max-w-3/4 group-[.exchange-picker]:max-w-full xs:max-w-[60px]">
                        <p className="text-base leading-5 font-medium">{token.symbol}</p>
                        <p className="text-secondary-text grow text-sm font-normal leading-4 truncate whitespace-nowrap">
                            {network.displayName}
                        </p>
                    </div>
                </>
            ) : (
                <SelectedRoutePlaceholder placeholder={placeholder} />
            )}
            <span className="px-2 pointer-events-none text-primary-text">
                <ChevronDown className="h-4 w-4 text-secondary-text" aria-hidden="true" />
            </span>
        </span>
    )
}

export const SelectedRoutePlaceholder = ({ placeholder }: { placeholder: string }) => (
    <>
        <div className="inline-flex items-center relative py-1">
            <RoutePickerIcon className="w-7 h-7" />
        </div>
        <span className="flex text-secondary-text text-base font-normal leading-5 flex-auto items-center max-w-3/4 group-[.exchange-picker]:max-w-full">
            <span className="ml-2 text-sm sm:text-base sm:leading-5 whitespace-nowrap">{placeholder}</span>
        </span>
    </>
)

const RoutePickerIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29" fill="none">
        <circle cx="12" cy="12" r="12" fill="rgb(var(--ls-colors-secondary-400))" />
        <rect x="13.5" y="13.5" width="15" height="15" rx="4.5" fill="rgb(var(--ls-colors-secondary-400))" stroke="rgb(var(--ls-colors-secondary-500))" />
    </svg>
)