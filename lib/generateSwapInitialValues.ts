import { SwapFormValues } from "../components/DTOs/SwapFormValues";
import { QueryParams } from "../Models/QueryParams";
import { isValidAddress } from "./address/validator";
import { LayerSwapAppSettings } from "../Models/LayerSwapAppSettings";

export function generateSwapInitialValues(settings: LayerSwapAppSettings, queryParams: QueryParams): SwapFormValues {
    const { destAddress, transferAmount, fromAsset, toAsset, from, to, lockFromAsset, lockToAsset } = queryParams
    const { routes } = settings || {}

    const sourceRoutes = routes?.map(route => route.source) || []
    const destinationRoutes = routes?.map(route => route.destination) || []

    const lockedSourceCurrency = lockFromAsset ?
        sourceRoutes.find(l => l.network.name === to)?.token
        : undefined
    const lockedDestinationCurrency = lockToAsset ?
        destinationRoutes.find(l => l.network.name === to)?.token
        : undefined

    const sourceNetwork = sourceRoutes.find(l => l.network.name.toUpperCase() === from?.toUpperCase())
    const destinationNetwork = destinationRoutes.find(l => l.network.name.toUpperCase() === to?.toUpperCase())

    const initialSource = settings.networks.find(n => n.name === sourceNetwork?.network.name) ?? undefined
    const initialDestination = settings.networks.find(n => n.name === destinationNetwork?.network.name) ?? undefined

    const filteredSourceCurrencies = lockedSourceCurrency ?
        [lockedSourceCurrency]
        : (sourceNetwork ? sourceRoutes.filter(r => r.network.name === sourceNetwork.network.name).map(r => r.token) : [])

    const filteredDestinationCurrencies = lockedDestinationCurrency ?
        [lockedDestinationCurrency]
        : (destinationNetwork ? destinationRoutes.filter(r => r.network.name === destinationNetwork.network.name).map(r => r.token) : [])

    let initialAddress =
        destAddress && initialDestination && isValidAddress(destAddress, initialDestination) ? destAddress : "";

    let initialSourceCurrency = filteredSourceCurrencies?.find(c => c.symbol?.toUpperCase() == fromAsset?.toUpperCase())

    let initialDestinationCurrency = filteredDestinationCurrencies?.find(c => c.symbol?.toUpperCase() == toAsset?.toUpperCase())

    let initialAmount =
        (lockedDestinationCurrency && transferAmount) || (initialDestinationCurrency ? transferAmount : '')

    const result: SwapFormValues = {
        from: initialSource,
        to: initialDestination,
        amount: initialAmount,
        fromCurrency: initialSourceCurrency,
        toCurrency: initialDestinationCurrency,
        destination_address: initialAddress ? initialAddress : '',
    }

    return result
}