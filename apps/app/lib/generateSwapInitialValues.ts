import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { Address } from "./address";
import { TrainAppSettings } from "../Models/TrainAppSettings";

export function generateSwapInitialValues(settings: TrainAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, transferAmount, fromAsset, toAsset, from, to } = queryParams
    const { networks } = settings || {}

    // Find networks by slug (case-insensitive)
    const initialSource = from
        ? networks?.find(n => n.caip2Id.toUpperCase() === from.toUpperCase())
        : undefined

    const initialDestination = to
        ? networks?.find(n => n.caip2Id.toUpperCase() === to.toUpperCase())
        : undefined

    // Find tokens within the selected networks
    const initialSourceCurrency = initialSource && fromAsset
        ? initialSource.tokens.find(t => t.symbol?.toUpperCase() === fromAsset.toUpperCase())
        : undefined

    const initialDestinationCurrency = initialDestination && toAsset
        ? initialDestination.tokens.find(t => t.symbol?.toUpperCase() === toAsset.toUpperCase())
        : undefined

    // Validate destination address
    let initialAddress = '';
    if (destAddress && initialDestination) {
        if (Address.isValid(destAddress, initialDestination)) {
            initialAddress = destAddress;
        }
    }

    let initialAmount = transferAmount || ''

    const result: SwapFormValues = {
        from: initialSource,
        to: initialDestination,
        amount: initialAmount,
        receiveAmount: '',
        quoteDirection: 'source',
        fromCurrency: initialSourceCurrency,
        toCurrency: initialDestinationCurrency,
        destination_address: initialAddress,
    }

    return result
}