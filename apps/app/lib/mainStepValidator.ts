import { FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { Address } from "./address";

export default function MainStepValidation(values: SwapFormValues): FormikErrors<SwapFormValues> {
    let errors: FormikErrors<SwapFormValues> = {};
    const isReverse = !!values.receiveAmount;
    const amountField: keyof SwapFormValues = isReverse ? 'receiveAmount' : 'amount';
    const activeAmount = isReverse
        ? (values.receiveAmount ? Number(values.receiveAmount) : undefined)
        : (values.amount ? Number(values.amount) : undefined);

    if (!values.fromCurrency) {
        errors.fromCurrency = 'Select source asset';
    }
    if (!values.toCurrency) {
        errors.toCurrency = 'Select destination asset';
    }
    if (!values.from) {
        errors.from = 'Select source';
    }
    if (!values.to) {
        errors.to = 'Select destination';
    }
    if (!activeAmount) {
        errors[amountField] = 'Enter an amount';
    }
    if (activeAmount && !/^[0-9]*[.,]?[0-9]*$/i.test(activeAmount.toString())) {
        errors[amountField] = 'Invalid amount';
    }
    if (activeAmount && activeAmount < 0) {
        errors[amountField] = "Can't be negative";
    }
    // if (maxAllowedAmount != undefined && (amount && amount > maxAllowedAmount)) {
    //     errors.amount = `Max amount is ${maxAllowedAmount}`;
    // }
    // if (minAllowedAmount != undefined && (amount && amount < minAllowedAmount)) {
    //     errors.amount = `Min amount is ${minAllowedAmount}`;
    // }
    if (values.to) {
        if (values.destination_address && !Address.isValid(values.destination_address, values.to)) {
            errors.destination_address = `Enter a valid ${values.to?.displayName} address`;
        }
    }
    return errors;
}