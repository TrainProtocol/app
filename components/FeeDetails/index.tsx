import { SwapFormValues } from '../DTOs/SwapFormValues';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import FeeDetails from './FeeDetailsComponent';
import ResizablePanel from '../ResizablePanel';
import { SwapQuote } from '../../lib/trainApiClient';

type FeeDetailsComponentProps = {
    values: SwapFormValues
    quote?: SwapQuote
    isFeeLoading?: boolean
}

export default function FeeDetailsComponent({ values, quote, isFeeLoading = false }: FeeDetailsComponentProps) {
    const { toCurrency, fromCurrency, amount } = values || {}
    const fee = quote != null ? { quote } : undefined

    return (
        <span className={amount ? 'visible' : 'hidden'}>
            <ResizablePanel>
                <FeeDetails>

                    {
                        quote && fromCurrency && toCurrency &&
                        <FeeDetails.Item>
                            <DetailedEstimates fromCurrency={fromCurrency} quote={quote} isFeeLoading={isFeeLoading} />
                        </FeeDetails.Item>
                    }

                    <FeeDetails.Item>
                        <ReceiveAmounts
                            source_token={fromCurrency}
                            destination_token={toCurrency}
                            fee={fee}
                            isFeeLoading={isFeeLoading}
                        />
                    </FeeDetails.Item>

                </FeeDetails>
            </ResizablePanel>
        </span>
    )
}
