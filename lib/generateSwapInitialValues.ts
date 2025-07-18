import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./address/validator";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, amount, fromAsset, toAsset, from, to, lockFromAsset, lockToAsset, depositMethod } = queryParams
    const { routes } = settings || {}

    const lockedSourceCurrency = lockFromAsset ?
        sourceRoutes.find(l => l.name === to)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === fromAsset?.toUpperCase())
        : undefined
    const lockedDestinationCurrency = lockToAsset ?
        destinationRoutes.find(l => l.name === to)
            ?.tokens?.find(c => c?.symbol?.toUpperCase() === toAsset?.toUpperCase())
        : undefined

    const sourceNetwork = sourceRoutes.find(l => l.name.toUpperCase() === from?.toUpperCase())
    const destinationNetwork = destinationRoutes.find(l => l.name.toUpperCase() === to?.toUpperCase())

    const initialSource = sourceNetwork ?? undefined
    const initialDestination = destinationNetwork ?? undefined

    const filteredSourceCurrencies = lockedSourceCurrency ?
        [lockedSourceCurrency]
        : sourceNetwork?.tokens

    const filteredDestinationCurrencies = lockedDestinationCurrency ?
        [lockedDestinationCurrency]
        : destinationNetwork?.tokens

    let initialAddress =
        destAddress && initialDestination && isValidAddress(destAddress, destinationNetwork) ? destAddress : "";

    let initialSourceCurrency = filteredSourceCurrencies?.find(c => c.symbol?.toUpperCase() == fromAsset?.toUpperCase())

    let initialDestinationCurrency = filteredDestinationCurrencies?.find(c => c.symbol?.toUpperCase() == toAsset?.toUpperCase())

    let initialAmount =
        (lockedDestinationCurrency && amount) || (initialDestinationCurrency ? amount : '')

    const result: SwapFormValues = {
        from: initialSource,
        to: initialDestination,
        amount: initialAmount,
        fromCurrency: initialSourceCurrency,
        toCurrency: initialDestinationCurrency,
        destination_address: initialAddress ? initialAddress : '',
        depositMethod: (depositMethod === "wallet" || depositMethod === "deposit_address") ? depositMethod : undefined,
    }

    return result
}


export function generateSwapInitialValuesFromSwap(swapResponse: any, settings: LayerSwapAppSettings): SwapFormValues {
    const { swap, refuel } = swapResponse || ''
    const {
        destination_address,
        requested_amount,
        source_network,
        destination_network,
        source_token,
        destination_token,
    } = swap

    const { routes } = settings || {}

    const from = sourceRoutes.find(l => l.name === source_network.name);
    const to = destinationRoutes.find(l => l.name === destination_network.name);

    const fromCurrency = from?.tokens.find(c => c.symbol === source_token.symbol);
    const toCurrency = to?.tokens.find(c => c.symbol === destination_token.symbol);

    const result: SwapFormValues = {
        from,
        to,
        amount: requested_amount?.toString(),
        fromCurrency,
        toCurrency,
        destination_address,
        refuel: !!refuel,
    }

    return result
}