import { FC, ReactNode, useMemo } from "react";
import { truncateDecimals } from "@/components/utils/RoundDecimals";
import { ExtendedNetwork, ExtendedToken } from "@/Models/Network";
import { ImageWithFallback } from "@/components/Common/ImageWithFallback";
import { ArrowDown } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { resolveTokenLogoUrl } from "@/components/utils/resolveTokenLogoUrl";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import MobileTooltip from "@/components/Modal/mobileTooltip";
import { useUsdModeStore } from "@/stores/usdModeStore";


type AtomicSummaryProps = {
    sourceCurrency: ExtendedToken,
    destinationCurrency: ExtendedToken,
    source: ExtendedNetwork,
    destination: ExtendedNetwork;
    requestedAmount: number | undefined;
    receiveAmount: string | undefined;
}

const TOKEN_MAX_FRACTION_DIGITS_MOBILE = 8;
const TOKEN_MAX_FRACTION_DIGITS_DESKTOP = 12;

const TokenAmount: FC<{ display: ReactNode; full: string; symbol: string; truncated: boolean }> = ({ display, full, symbol, truncated }) => {
    const node = (
        <span className="inline-flex items-center min-w-0 gap-1">
            <span className="truncate min-w-0">{display}</span>
            {truncated && <span className="shrink-0">...</span>}
            <span className="shrink-0">{symbol}</span>
        </span>
    )
    if (!truncated) return node
    return (
        <MobileTooltip trigger={<span>{node}</span>}>
            {full} {symbol}
        </MobileTooltip>
    )
}

const UsdAmount: FC<{ value: number | string | undefined }> = ({ value }) => (
    <NumberFlow value={Number(value) || 0} prefix="$" trend={0} />
)

const Summary: FC<AtomicSummaryProps> = ({ sourceCurrency, destinationCurrency, source, destination, requestedAmount, receiveAmount, }) => {

    const { isMobile } = useWindowDimensions()
    const maxFractionDigits = isMobile ? TOKEN_MAX_FRACTION_DIGITS_MOBILE : TOKEN_MAX_FRACTION_DIGITS_DESKTOP
    const isUsdMode = useUsdModeStore(s => s.isUsdMode)

    const requestedAmountInUsd = (requestedAmount && sourceCurrency?.priceInUsd) ? (sourceCurrency.priceInUsd * Number(requestedAmount)).toFixed(2) : undefined
    const receiveAmountInUsd = (receiveAmount && destinationCurrency?.priceInUsd) ? (destinationCurrency.priceInUsd * Number(receiveAmount)).toFixed(2) : undefined

    const requestedAmountNum = Number(requestedAmount)
    const isSendTruncated = requestedAmountNum > 0 && isFinite(requestedAmountNum) && Number(requestedAmountNum.toFixed(maxFractionDigits)) !== requestedAmountNum
    const receiveAmountNum = Number(receiveAmount)
    const isReceiveTruncated = receiveAmountNum > 0 && isFinite(receiveAmountNum) && Number(receiveAmountNum.toFixed(maxFractionDigits)) !== receiveAmountNum
    const tokenAmountFormat = useMemo(() => ({ maximumFractionDigits: maxFractionDigits }), [maxFractionDigits])

    const sendToken = useMemo(() => (
        <TokenAmount
            display={<NumberFlow value={requestedAmountNum} trend={0} format={tokenAmountFormat} />}
            full={truncateDecimals(requestedAmountNum, sourceCurrency.decimals)}
            symbol={sourceCurrency.symbol}
            truncated={isSendTruncated}
        />
    ), [requestedAmountNum, sourceCurrency.decimals, sourceCurrency.symbol, isSendTruncated, tokenAmountFormat])
    const sendUsd = useMemo(() => <UsdAmount value={requestedAmountInUsd} />, [requestedAmountInUsd])
    const recvToken = useMemo(() => (
        <TokenAmount
            display={<NumberFlow value={receiveAmountNum} trend={0} format={tokenAmountFormat} />}
            full={truncateDecimals(receiveAmountNum, destinationCurrency.decimals)}
            symbol={destinationCurrency.symbol}
            truncated={isReceiveTruncated}
        />
    ), [receiveAmountNum, destinationCurrency.decimals, destinationCurrency.symbol, isReceiveTruncated, tokenAmountFormat])
    const recvUsd = useMemo(() => <UsdAmount value={receiveAmountInUsd} />, [receiveAmountInUsd])

    return (
        <>
            <div className="bg-secondary-500 rounded-2xl px-3 py-4 w-full relative z-10 space-y-4">
                <div className="font-normal flex flex-col w-full relative z-10 space-y-3">
                    <div className="w-full grid grid-cols-10">
                        <RouteTokenPair
                            route={source}
                            token={sourceCurrency}
                        />
                        <div className="flex flex-col col-start-6 col-span-5 items-end min-w-0">
                            {requestedAmount && (
                                <>
                                    <p className="text-primary-text text-xl leading-6 h-6 font-normal flex items-center justify-end min-w-0 w-full">
                                        {isUsdMode ? sendUsd : sendToken}
                                    </p>
                                    <p className="text-secondary-text text-sm leading-5 flex items-center font-medium justify-end gap-1">
                                        {isUsdMode ? sendToken : sendUsd}
                                    </p>
                                </>
                            )}
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
                                <div className="flex flex-col items-end w-full col-start-6 col-span-5 min-w-0">
                                    <p className="text-primary-text text-xl leading-6 h-6 font-normal flex items-center justify-end min-w-0 w-full">
                                        {isUsdMode ? recvUsd : recvToken}
                                    </p>
                                    <p className="text-secondary-text text-sm leading-5 flex items-center gap-1 font-medium">
                                        {isUsdMode ? recvToken : recvUsd}
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
        <div className="flex grow gap-4 text-left items-center md:text-base relative col-span-5 align-center">
            <div className="inline-flex items-center relative shrink-0 h-8 w-8">
                <ImageWithFallback
                    src={token.logoUrl || resolveTokenLogoUrl(token.symbol)}
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
