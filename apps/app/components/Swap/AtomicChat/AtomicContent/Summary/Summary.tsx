import { FC } from "react";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { ExtendedNetwork, ExtendedToken } from "@/Models/Network";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { ArrowDown } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { resolveTokenLogoUrl } from "@/components/utils/resolveTokenLogoUrl";


type AtomicSummaryProps = {
    sourceCurrency: ExtendedToken,
    destinationCurrency: ExtendedToken,
    source: ExtendedNetwork,
    destination: ExtendedNetwork;
    requestedAmount: number | undefined;
    receiveAmount: string | undefined;
}

const Summary: FC<AtomicSummaryProps> = ({ sourceCurrency, destinationCurrency, source, destination, requestedAmount, receiveAmount, }) => {

    const requestedAmountInUsd = (requestedAmount && sourceCurrency?.priceInUsd) ? (sourceCurrency.priceInUsd * Number(requestedAmount)).toFixed(2) : undefined
    const receiveAmountInUsd = (receiveAmount && destinationCurrency?.priceInUsd) ? (destinationCurrency.priceInUsd * Number(receiveAmount)).toFixed(2) : undefined

    return (
        <>
            <div className="bg-secondary-500 rounded-2xl px-3 py-4 w-full relative z-10 space-y-4">
                <div className="font-normal flex flex-col w-full relative z-10 space-y-3">
                    <div className="w-full grid grid-cols-10">
                        <RouteTokenPair
                            route={source}
                            token={sourceCurrency}
                        />
                        <div className="flex flex-col col-start-7 col-span-4 items-end">
                            {
                                requestedAmount &&
                                <p className="text-primary-text text-xl leading-6 font-normal whitespace-nowrap">{truncateDecimals(Number(requestedAmount), sourceCurrency.decimals)} {sourceCurrency.symbol}</p>
                            }
                            <p className="text-secondary-text text-sm leading-5 flex font-medium justify-end"><NumberFlow value={Number(requestedAmountInUsd) || 0} prefix="$" trend={0} /></p>
                        </div>
                    </div>
                    <div className="relative text-secondary-text">
                        <hr className="border border-secondary-400 w-full rounded-full" />
                        <ArrowDown className="absolute left-1/2 -translate-x-1/2 top-[-10px] h-6 w-6 p-1 bg-secondary-400 rounded-md text-secondary-text" />
                    </div>
                    <div className="w-full grid grid-cols-10">
                        <RouteTokenPair
                            route={destination}
                            token={destinationCurrency}
                        />
                        {
                            receiveAmount && (
                                <div className="flex flex-col justify-end items-end w-full col-start-7 col-span-4 h-[44px]">
                                    <p className="text-primary-text text-xl font-normal text-end">
                                        <NumberFlow value={Number(receiveAmount)} suffix={` ${destinationCurrency.symbol}`} trend={0} format={{ maximumFractionDigits: destinationCurrency.decimals || 2 }} />
                                    </p>
                                    <p className="text-secondary-text text-sm flex items-center gap-1 font-medium">
                                        <NumberFlow value={Number(receiveAmountInUsd) || 0} prefix="$" trend={0} />
                                    </p>
                                </div>
                            )
                        }
                    </div>
                </div>
            </div>
        </>
    )
}

type RouteTokenPairProps = {
    route: ExtendedNetwork,
    token: ExtendedToken,
}

const RouteTokenPair: FC<RouteTokenPairProps> = ({ route, token }) => {

    return (
        <div className="flex grow gap-4 text-left items-center md:text-base relative col-span-6 align-center">
            <div className="inline-flex items-center relative shrink-0 h-8 w-8">
                <ImageWithFallback
                    src={token.logo || resolveTokenLogoUrl(token.symbol)}
                    alt="Token Logo"
                    height="28"
                    width="28"
                    loading="eager"
                    fetchPriority="high"
                    className="rounded-full object-contain"
                />
                <div className="absolute -right-0.5 -bottom-0.5 rounded border border-secondary-500 bg-secondary-400 overflow-hidden">
                    <ImageWithFallback
                        src={route.logoUrl ?? ''}
                        alt="Route Logo"
                        height="16"
                        width="16"
                        loading="eager"
                        fetchPriority="high"
                        className="object-contain"
                    />
                </div>
            </div>
            <div className="text-primary-text overflow-hidden">
                <p className="text-xl leading-6 font-normal">{token.symbol}</p>
                <p className="text-secondary-text text-sm truncate whitespace-nowrap font-medium leading-5">
                    {route.displayName}
                </p>
            </div>
        </div>
    )
}


export default Summary