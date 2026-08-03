import { FC } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../shadcn/tooltip'
import { RateElement } from '../Rate'
import type { SwapQuote } from '@train-protocol/react'
import { SwapFormValues } from '../../DTOs/SwapFormValues'
import { useGasFeeDisplay, useSwapFeeDisplay } from '../useFeeDisplay'

type DetailedEstimatesProps = {
    quote: SwapQuote | undefined,
    values: SwapFormValues,
}

export const DetailedEstimates: FC<DetailedEstimatesProps> = ({
    quote,
    values,
}) => {
    return <div className="flex flex-col w-full px-2">
        <GasFee values={values} />
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

const GasFee = ({ values }: { values: SwapFormValues }) => {
    const { gasData, isGasLoading, gasFeeInUsd, displayGasFeeInUsd, truncatedGas } = useGasFeeDisplay(values)

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
                <TooltipContent>
                    <span>{truncatedGas || '-'} </span>
                    <span>{gasData ? gasData.token.symbol : ''}</span>
                </TooltipContent>
            </Tooltip>
        </div>}
    </RowWrapper>
}

const Fees = ({ quote, values }: { quote: SwapQuote | undefined, values: SwapFormValues }) => {
    const { displayFee, displayFeeInUsd, feeSymbol: currencyName } = useSwapFeeDisplay(values, quote)

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
            <TooltipContent>
                <span>{displayFee || '-'} </span>
                <span>{displayFee && displayFee !== 'Free' ? currencyName : ''}</span>
            </TooltipContent>
        </Tooltip>
    </RowWrapper>
}

const Rate = ({ quote, values }: { quote: SwapQuote | undefined, values: SwapFormValues }) => {
    const fromAsset = values.fromCurrency
    const toAsset = values.toCurrency

    if (!fromAsset || !toAsset || !quote?.rate) return null
    const rate = Number(quote.rate)
    if (!rate) return null

    return <RowWrapper title="Rate">
        <RateElement fromAsset={fromAsset} toAsset={toAsset} rate={rate} />
    </RowWrapper>
}

const LoadingBar = () => (<div className='h-2.5 w-16 inline-flex bg-gray-500 rounded-xs animate-pulse' />)
