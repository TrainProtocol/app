import { useFormikContext } from "formik";
import { FC, useCallback, useEffect } from "react";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import PopoverSelectWrapper from "../Select/Popover/PopoverSelectWrapper";
import { ResolveCurrencyOrder, SortAscending } from "../../lib/sorting";
import { truncateDecimals } from "../utils/RoundDecimals";
import { useQueryState } from "../../context/query";
import { Route, Token } from "../../Models/Network";
import LayerSwapApiClient from "../../lib/trainApiClient";
import useSWR from "swr";
import { Balance } from "../../Models/Balance";
import { QueryParams } from "../../Models/QueryParams";
import { ApiError, LSAPIKnownErrorCode } from "../../Models/ApiError";
import RouteIcon from "./RouteIcon";
import useSWRBalance from "../../lib/balances/useSWRBalance";
import { useAtomicState } from "../../context/atomicContext";

const CurrencyFormField: FC<{ direction: SwapDirection }> = ({ direction }) => {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();

    const { from, to, fromCurrency, toCurrency, destination_address } = values
    const name = direction === 'from' ? 'fromCurrency' : 'toCurrency';
    const query = useQueryState()
    const { selectedSourceAccount } = useAtomicState()

    const address = direction === 'from' ? (selectedSourceAccount?.address) : (destination_address)

    const { balance } = useSWRBalance(address, direction === 'from' ? from : to)

    const apiClient = new LayerSwapApiClient()
    const {
        data: routes,
        isLoading,
        error
    } = useSWR<Route[]>('/routes', apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const routesData = (direction == 'from' ? from : to) && routes?.filter(r => (direction === 'from' ? r.source.network.name : r.destination.network.name) === (direction === 'from' ? from?.name : to?.name))

    const fromCurrencies = routesData?.map(r => r.source.token);
    const toCurrencies = routesData?.map(r => r.destination.token);
    const currencies = direction === 'from' ? fromCurrencies : toCurrencies;

    const currencyMenuItems = currencies ? GenerateCurrencyMenuItems(
        currencies,
        values,
        direction,
        balance || [],
        query,
        error
    ) : []
    const currencyAsset = direction === 'from' ? fromCurrency?.symbol : toCurrency?.symbol;
    const value = currencyMenuItems?.find(x => x.id == currencyAsset);

    useEffect(() => {
        if (direction !== "to") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.symbol === currencyAsset)

        if (currencyIsAvailable) return

        const assetFromQuery = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.toAsset)?.toUpperCase())

        const isLocked = query?.lockToAsset

        const default_currency = assetFromQuery || (!isLocked && currencyMenuItems?.[0])

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === fromCurrency?.symbol?.toUpperCase())
        if (selected_currency && toCurrencies?.some(r => r.symbol === selected_currency.name
            // && r.status === 'active'
        )) {
            setFieldValue(name, selected_currency.baseObject, true)
        }
        else if (default_currency) {
            setFieldValue(name, default_currency.baseObject, true)
        }
    }, [to, query, routes])


    useEffect(() => {
        if (direction !== "from") return

        let currencyIsAvailable = (fromCurrency || toCurrency) && currencyMenuItems?.some(c => c?.baseObject.symbol === currencyAsset)

        if (currencyIsAvailable) return

        const assetFromQuery = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === (query?.fromAsset)?.toUpperCase())

        const isLocked = query?.lockFromAsset

        const default_currency = assetFromQuery || (!isLocked && currencyMenuItems?.[0])

        const selected_currency = currencyMenuItems?.find(c =>
            c.baseObject?.symbol?.toUpperCase() === toCurrency?.symbol?.toUpperCase())

        if (selected_currency
            && fromCurrencies
                ?.some(r => r.symbol === selected_currency.name
                    // && r.status === 'active'
                )) {
            setFieldValue(name, selected_currency.baseObject, true)
        }
        else if (default_currency) {
            setFieldValue(name, default_currency.baseObject, true)
        }
    }, [from, query, routes])

    useEffect(() => {
        if (name === "toCurrency" && toCurrency && !isLoading && routes) {
            const value = toCurrencies?.find(r => r.symbol === toCurrency?.symbol)
            if (!value) return

            setFieldValue(name, value)
        }
    }, [fromCurrency, name, to, routes, error, isLoading])

    useEffect(() => {
        if (name === "fromCurrency" && fromCurrency && !isLoading && routes) {
            const value = fromCurrencies?.find(r => r.symbol === fromCurrency?.symbol)
            if (!value) return

            setFieldValue(name, value)
        }
    }, [toCurrency, name, from, routes, error, isLoading])

    const handleSelect = useCallback((item: SelectMenuItem<Token>) => {
        setFieldValue(name, item.baseObject, true)
    }, [name, direction, toCurrency, fromCurrency, from, to])

    const isLocked = direction === 'from' ? query?.lockFromAsset
        : query?.lockToAsset

    return (
        <div className="relative">
            <PopoverSelectWrapper
                placeholder="Asset"
                values={currencyMenuItems}
                value={value}
                setValue={handleSelect}
                disabled={isLoading || isLocked}
            />
        </div>
    )
};

function GenerateCurrencyMenuItems(
    currencies: Token[],
    values: SwapFormValues,
    direction: string,
    balances?: Balance[],
    query?: QueryParams,
    error?: ApiError
): SelectMenuItem<Token>[] {
    const { to, from } = values

    return currencies?.map(c => {
        const currency = c
        const displayName = currency.symbol;
        const balance = balances?.find(b => b?.token === c?.symbol && (direction === 'from' ? from : to)?.name === b.network)
        const formatted_balance_amount = balance ? Number(truncateDecimals(balance?.amount, Math.min(c.decimals, 8))) : ''

        const currencyIsAvailable = (
            // currency?.status === "active" && 
            error?.code !== LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR) ||
            !((direction === 'from' ? query?.lockFromAsset : query?.lockToAsset) || query?.lockAsset
                // || currency.status === 'inactive'
            )

        const routeNotFound = (
            // currency?.status !== "active" || 
            error?.code === LSAPIKnownErrorCode.ROUTE_NOT_FOUND_ERROR);


        const details = <p className="text-primary-text-muted">
            {formatted_balance_amount}
        </p>

        const logo = `https://raw.githubusercontent.com/TrainProtocol/icons/main/tokens/${c.symbol.toLowerCase()}.png`

        const res: SelectMenuItem<Token> = {
            baseObject: c,
            id: c.symbol,
            name: displayName || "-",
            order: ResolveCurrencyOrder(c),
            imgSrc: logo,
            isAvailable: currencyIsAvailable,
            details,
            leftIcon: <RouteIcon direction={direction} isAvailable={currencyIsAvailable} routeNotFound={!!routeNotFound} type="token" />
        };

        return res
    })
        .sort(SortAscending)
        .filter((route, index, self) => index === self.findIndex(r => r.name === route.name)) || [];

}

export default CurrencyFormField