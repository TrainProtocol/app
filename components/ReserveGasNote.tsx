import WarningMessage from "./WarningMessage"
import { useFormikContext } from "formik"
import { SwapFormValues } from "./DTOs/SwapFormValues"
import { truncateDecimals } from "./utils/RoundDecimals"
import { useFee } from "../context/feeContext"
import { Balance } from "../Models/Balance"
import useSWRBalance from "../lib/balances/useSWRBalance"
import useSWRGas from "../lib/gases/useSWRGas"
import { useAtomicState } from "../context/atomicContext"

const ReserveGasNote = ({ onSubmit }: { onSubmit: (walletBalance: Balance, networkGas: number) => void }) => {
    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { minAllowedAmount, maxAllowedAmount } = useFee()
    const { selectedSourceAccount } = useAtomicState()

    const { balance } = useSWRBalance(selectedSourceAccount?.address, values.from)
    const { gas: networkGas } = useSWRGas(selectedSourceAccount?.address, values.from, values.fromCurrency)

    const walletBalance = selectedSourceAccount && balance?.find(b => b?.network === values?.from?.name && b?.token === values?.fromCurrency?.symbol)

    const mightBeAutOfGas = !!(networkGas && walletBalance?.isNativeCurrency && (Number(values.amount)
        + networkGas) > walletBalance.amount
        && minAllowedAmount
        && walletBalance.amount > minAllowedAmount
        && !(walletBalance.amount > (maxAllowedAmount + networkGas))
    )
    const gasToReserveFormatted = (mightBeAutOfGas && values?.fromCurrency?.decimals) ? truncateDecimals(networkGas, Math.min(values?.fromCurrency?.decimals, 8)) : 0

    return (
        mightBeAutOfGas && gasToReserveFormatted > 0 &&
        <WarningMessage messageType="warning" className="mt-4">
            <div className="font-normal text-primary-text">
                <div>
                    You might not be able to complete the transaction.
                </div>
                <div onClick={() => onSubmit(walletBalance, networkGas)} className="cursor-pointer border-b border-dotted border-primary-text w-fit hover:text-primary hover:border-primary text-primary-text">
                    <span>Reserve</span> <span>{gasToReserveFormatted.toFixed(Math.min(values.fromCurrency?.decimals || 8, 8))}</span> <span>{values?.fromCurrency?.symbol}</span> <span>for gas.</span>
                </div>
            </div>
        </WarningMessage>
    )
}

export default ReserveGasNote