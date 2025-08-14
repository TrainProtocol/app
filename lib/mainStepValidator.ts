import { FormikErrors } from "formik";
import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { isValidAddress } from "./address/validator";

export default function MainStepValidation(): ((values: SwapFormValues) => FormikErrors<SwapFormValues>) {
    return (values: SwapFormValues) => {
        let errors: FormikErrors<SwapFormValues> = {};
        let amount = values.amount ? Number(values.amount) : undefined;

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
        if (!amount) {
            errors.amount = 'Enter an amount';
        }
        if (amount && !/^[0-9]*[.,]?[0-9]*$/i.test(amount.toString())) {
            errors.amount = 'Invalid amount';
        }
        if (amount && amount < 0) {
            errors.amount = "Can't be negative";
        }
        // if (maxAllowedAmount != undefined && (amount && amount > maxAllowedAmount)) {
        //     errors.amount = `Max amount is ${maxAllowedAmount}`;
        // }
        // if (minAllowedAmount != undefined && (amount && amount < minAllowedAmount)) {
        //     errors.amount = `Min amount is ${minAllowedAmount}`;
        // }
        if (values.to) {
            if (values.destination_address && !isValidAddress(values.destination_address, values.to)) {
                errors.destination_address = `Enter a valid ${values.to?.displayName} address`;
            }
        }
        return errors;
    };
}