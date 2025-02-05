
import { SwapFormValues } from '../DTOs/SwapFormValues';
import { ReceiveAmounts } from './ReceiveAmounts';
import DetailedEstimates from './DetailedEstimates';
import { useFee } from '../../context/feeContext';
import FeeDetails from './FeeDetailsComponent';
import ResizablePanel from '../ResizablePanel';

export default function FeeDetailsComponent({ values }: { values: SwapFormValues }) {
    const { toCurrency, refuel, fromCurrency, amount } = values || {};
    const { fee, isFeeLoading } = useFee()

    return (
        <span className={amount ? 'visible' : 'hidden'}>
            <ResizablePanel>
                <FeeDetails>

                    {
                        fee && fromCurrency && toCurrency &&
                        <FeeDetails.Item>
                            <DetailedEstimates />
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
