import { NetworkRoute, NetworkRouteToken } from "@/Models/NetworkRoute";
import { SwapDirection } from "@/components/DTOs/SwapFormValues";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { SelectItem } from "@/components/Select/Selector/SelectItem";
import { ChevronDown } from "lucide-react";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import useSWRBalance from "@/lib/balances/useSWRBalance";
import { useAtomicState } from "@/context/atomicContext";
import { memo } from "react";
import { RowElement } from "@/Models/Route";

type TokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    type?: RowElement['type'];
    selected: boolean;
    direction: SwapDirection;
};

export const CurrencySelectItemDisplay = memo((props: TokenItemProps) => {
    const { item, route, direction } = props

    return <SelectItem className="group">
        <SelectItem.Logo
            imgSrc={item.logo || `https://raw.githubusercontent.com/TrainProtocol/icons/main/tokens/${item.symbol.toLowerCase()}.png`}
            altText={`${item.symbol} logo`}
            className="rounded-full"
        />
        <NetworkTokenTitle item={item} route={route} direction={direction} />
    </SelectItem>
});

CurrencySelectItemDisplay.displayName = 'CurrencySelectItemDisplay';

type NetworkTokenItemProps = {
    route: NetworkRoute;
    item: NetworkRouteToken;
    direction: SwapDirection;
}

export const NetworkTokenTitle = (props: NetworkTokenItemProps) => {
    const { item, route, direction } = props
    const { selectedSourceAccount } = useAtomicState();

    const address = direction === 'from' ? selectedSourceAccount?.address : undefined;
    const { balance } = useSWRBalance(address, route);

    const tokenBalance = balance?.find(b => b.token === item.symbol);
    const formatted_balance_amount = (tokenBalance?.amount || tokenBalance?.amount === 0)
        ? truncateDecimals(tokenBalance?.amount, Math.min(item.decimals, 8))
        : '';
    const usdAmount = (tokenBalance?.amount && item?.priceInUsd) ? item?.priceInUsd * tokenBalance?.amount : undefined;

    return <SelectItem.DetailedTitle
        title={
            <div className="flex items-center justify-between w-full gap-2">
                <span className="font-medium">{item.symbol}</span>
                {usdAmount && usdAmount > 0.01 && (
                    <span className="text-xs text-secondary-text">
                        ${usdAmount.toFixed(2)}
                    </span>
                )}
            </div>
        }
        secondaryImageAlt={route.displayName}
        secondary={
            <div className="flex items-center gap-1">
                <span className="truncate">{route.displayName}</span>
            </div>
        }
        secondaryLogoSrc={route.logo}
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

type NetworkRouteItemProps = {
    item: NetworkRoute;
    selected: boolean;
    direction: SwapDirection;
}

export const NetworkRouteSelectItemDisplay = (props: NetworkRouteItemProps) => {
    const { item } = props

    return (
        <SelectItem className="accordion-item-focused bg-secondary-500 group rounded-xl hover:bg-secondary-400 group/item relative pr-7 py-2 ring-hidden">
            <SelectItem.Logo imgSrc={item.logo} altText={`${item.displayName} logo`} className="rounded-md" />
            <SelectItem.Title>
                <>
                    <span>
                        {item.displayName}
                    </span>

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
    route?: NetworkRoute;
    token?: NetworkRouteToken;
    placeholder: string;
}

export const SelectedRouteDisplay = ({ route, token, placeholder }: SelectedRouteDisplayProps) => {
    const showContent = token && route;

    return (
        <span className="flex grow text-left items-center text-xs md:text-base relative">
            {showContent ? (
                <>
                    <div className="inline-flex items-center relative shrink-0 h-7 w-7">
                        <div className="h-6 w-6">
                            <ImageWithFallback
                                src={token.logo || `https://raw.githubusercontent.com/TrainProtocol/icons/main/tokens/${token.symbol.toLowerCase()}.png`}
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
                                src={route.logo || ''}
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
                            {route.displayName}
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