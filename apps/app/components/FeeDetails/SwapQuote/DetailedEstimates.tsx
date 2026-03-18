import { FC, useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../shadcn/tooltip'
import { RateElement } from '../Rate'
import { SwapQuote } from '@/lib/trainApiClient'
import { SwapFormValues } from '../../DTOs/SwapFormValues'
import useWallet from '@/hooks/useWallet'
import useSWRGas from '@/lib/gases/useSWRGas'
import { resolveTokenUsdPrice } from '@/helpers/tokenHelper'
import formatAmount from '@/lib/formatAmount'
import { truncateDecimals } from '@/components/utils/RoundDecimals'

type DetailedEstimatesProps = {
    quote: SwapQuote | undefined,
    values: SwapFormValues,
}

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({
    quote,
    values,
}) => {
    return <div className="flex flex-col w-full px-2">
        <GasFee values={values} quote={quote} />
        <Fees quote={quote} values={values} />
        <Rate quote={quote} values={values} />
    </div>
}

type RowWrapperProps = {
    children: React.ReactNode
    title: string
}

const RowWrapper = ({ children, title }: RowWrapperProps) => {
    return <div className="flex items-center w-full justify-between gap-1 py-3 px-2 text-sm">
        <div className="inline-flex items-center text-left text-secondary-text gap-1 pr-4">
            <label>
                {title}
            </label>
        </div>
        <div className="text-right text-primary-text">
            {children}
        </div>
    </div>
}

export const GasFee = ({ values, quote }: { values: SwapFormValues, quote: SwapQuote | undefined }) => {
    const { wallets } = useWallet(values.from, 'withdrawal')
    const wallet = wallets?.[0]

    const { gasData, isGasLoading } = useSWRGas(wallet?.address, values.from, values.fromCurrency)
    const gasTokenPriceInUsd = resolveTokenUsdPrice(gasData?.token)
    const gasFeeInUsd = gasData && gasTokenPriceInUsd ? gasData.gas * gasTokenPriceInUsd : null
    const displayGasFeeInUsd = gasFeeInUsd != null ? (gasFeeInUsd < 0.01 ? '<$0.01' : `$${gasFeeInUsd.toFixed(2)}`) : null
    const truncatedGas = gasData?.gas ? truncateDecimals(gasData.gas, Math.min(gasData.token?.decimals, 8)) : null

    if (!gasFeeInUsd) return null

    return <RowWrapper title="Gas Fee">
        {isGasLoading ? (
            <LoadingBar />
        ) : <div>
            <Tooltip>
                <TooltipTrigger asChild>
                    {gasData !== undefined && (
                        <span className="text-sm ml-1 font-small">
                            {displayGasFeeInUsd}
                        </span>
                    )}
                </TooltipTrigger>
                <TooltipContent className="bg-secondary-400! border-secondary-400! text-primary-text!">
                    <span>{truncatedGas || '-'} </span>
                    <span>{gasData ? gasData.token.symbol : ''}</span>
                </TooltipContent>
            </Tooltip>
        </div>}
    </RowWrapper>
}

const Fees = ({ quote, values }: { quote: SwapQuote | undefined, values: SwapFormValues }) => {
    const fromCurrency = values.fromCurrency

    const fee_amount = useMemo(() => {
        if (!quote?.totalFee || !fromCurrency) return null
        return formatAmount(BigInt(quote.totalFee), fromCurrency.decimals)
    }, [quote?.totalFee, fromCurrency])

    const feeInUsd = useMemo(() => {
        if (fee_amount === null || fee_amount === undefined) return null
        const priceInUsd = resolveTokenUsdPrice(fromCurrency)
        if (!priceInUsd) return null
        return Number(fee_amount) * priceInUsd
    }, [fee_amount, fromCurrency, quote])

    const displayFeeInUsd = feeInUsd != null
        ? (feeInUsd === 0 ? 'Free' : feeInUsd < 0.01 ? '<$0.01' : `$${feeInUsd.toFixed(2)}`)
        : null

    const displayFee = fee_amount !== null && fee_amount !== undefined
        ? (Number(fee_amount) === 0 ? 'Free' : truncateDecimals(Number(fee_amount), Math.min(fromCurrency?.decimals || 8, 8)))
        : undefined

    const currencyName = fromCurrency?.symbol || ''

    return <RowWrapper title="Fees">
        <Tooltip>
            <TooltipTrigger asChild>
                {displayFeeInUsd !== null ? (
                    <span className="text-sm ml-1 font-small">
                        {displayFeeInUsd}
                    </span>
                ) : (
                    <span className="text-sm ml-1 font-small">
                        {displayFee || '-'} {displayFee && displayFee !== 'Free' ? currencyName : ''}
                    </span>
                )}
            </TooltipTrigger>
            <TooltipContent className="bg-secondary-400! border-secondary-400! text-primary-text!">
                <span>{displayFee || '-'} </span>
                <span>{displayFee && displayFee !== 'Free' ? currencyName : ''}</span>
            </TooltipContent>
        </Tooltip>
    </RowWrapper>
}

const Rate = ({ quote, values }: { quote: SwapQuote | undefined, values: SwapFormValues }) => {
    const fromAsset = values.fromCurrency
    const toAsset = values.toCurrency

    const rate = useMemo(() => {
        if (!quote?.receiveAmount || !values.amount || !fromAsset || !toAsset) return null
        const sendAmount = parseFloat(values.amount)
        if (!sendAmount || sendAmount === 0) return null
        const receiveAmount = toAsset ? formatAmount(BigInt(quote.receiveAmount), toAsset.decimals) : null
        if (!receiveAmount || Number(receiveAmount) === 0) return null
        return Number(receiveAmount) / sendAmount
    }, [quote?.receiveAmount, values.amount, fromAsset, toAsset])

    if (!fromAsset || !toAsset || !rate) return null

    return <RowWrapper title="Rate">
        <RateElement fromAsset={fromAsset} toAsset={toAsset} rate={rate} />
    </RowWrapper>
}

const LoadingBar = () => (<div className='h-2.5 w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />)
