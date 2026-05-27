import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { Address } from "./address";
import { TrainAppSettings } from "../Models/TrainAppSettings";

export function generateSwapInitialValues(settings: TrainAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, transferAmount, receiveAmount, fromAsset, toAsset, from, to } = queryParams
    const { networks } = settings || {}

    const byCaip2 = new Map(networks?.map(n => [n.caip2Id.toLowerCase(), n]))
    const initialSource = from ? byCaip2.get(from.toLowerCase().replace('-', ':')) : undefined
    const initialDestination = to ? byCaip2.get(to.toLowerCase().replace('-', ':')) : undefined

    const pickDefaultToken = (network: typeof initialSource) =>
        network?.tokens.slice().sort((a, b) => a.symbol.localeCompare(b.symbol))[0]

    const initialSourceCurrency = initialSource
        ? (fromAsset
            ? initialSource.tokens.find(t => t.symbol?.toUpperCase() === fromAsset.toUpperCase())
            : pickDefaultToken(initialSource))
        : undefined

    const initialDestinationCurrency = initialDestination
        ? (toAsset
            ? initialDestination.tokens.find(t => t.symbol?.toUpperCase() === toAsset.toUpperCase())
            : pickDefaultToken(initialDestination))
        : undefined

    // Validate destination address
    let initialAddress = '';
    if (destAddress && initialDestination) {
        if (Address.isValid(destAddress, initialDestination)) {
            initialAddress = destAddress;
        }
    }

    let initialAmount = transferAmount || ''
    let initialReceiveAmount = initialAmount ? '' : (receiveAmount || '')

    const result: SwapFormValues = {
        from: initialSource,
        to: initialDestination,
        amount: initialAmount,
        receiveAmount: initialReceiveAmount,
        fromCurrency: initialSourceCurrency,
        toCurrency: initialDestinationCurrency,
        destination_address: initialAddress,
    }

    return result
}