import { Network, Token } from "../Models/Network";
import { SwapDirection } from "../components/DTOs/SwapFormValues";
import CurrencySettings from "./CurrencySettings";
import NetworkSettings from "./NetworkSettings";

export const SortAscending = (x: { order: number }, y: { order: number }) => x.order - y.order;

export function ResolveNetworkOrder(network: Network, direction: SwapDirection, is_new: boolean) {


    let orderProp: keyof NetworkSettings = direction == 'from' ? 'OrderInSource' : 'OrderInDestination';
    const initial_order = resolveInitialWeightedOrder(NetworkSettings.KnownSettings[network.name]?.[orderProp], 1)

    // const is_active = network.tokens?.some(r => r.status === 'active')
    // const is_inactive = network.tokens?.every(r => r.status === 'inactive')

    return initial_order + resolveConditionWeight(is_new, 2);
}
export function ResolveCurrencyOrder(currency: Token, is_new: boolean) {

    const initial_order = resolveInitialWeightedOrder(CurrencySettings.KnownSettings[currency.symbol]?.Order, 1)
    // const is_active = currency.status === 'active'
    // const is_inactive = currency.status === 'inactive'

    return initial_order 

}

const resolveInitialWeightedOrder = (settingsOrder: number | undefined, initialOrderWeight: number) => {
    // Add 1 to distinguish between 0 and undefined
    const settings_order = (Number(settingsOrder) + 1)
    const hasSettings = settings_order > 0
    return settings_order || resolveConditionWeight(hasSettings, initialOrderWeight)
}

const resolveConditionWeight = (value: boolean, priority: number) => value ? 0 : 10 ** (priority + 1)
