import { useFormikContext } from "formik";
import { forwardRef, useCallback, useEffect, useState } from "react";
import { useSettingsState } from "../../context/settings";
import { SwapDirection, SwapFormValues } from "../DTOs/SwapFormValues";
import { ISelectMenuItem, SelectMenuItem } from "../Select/Shared/Props/selectMenuItem";
import CommandSelectWrapper from "../Select/Command/CommandSelectWrapper";
import { ResolveNetworkOrder, SortAscending } from "../../lib/sorting"
import NetworkSettings from "../../lib/NetworkSettings";
import { SelectMenuItemGroup } from "../Select/Command/commandSelect";
import { useQueryState } from "../../context/query";
import CurrencyFormField from "./CurrencyFormField";
import useSWR from 'swr'
import { ApiResponse } from "../../Models/ApiResponse";
import LayerSwapApiClient from "../../lib/trainApiClient";
import { Network, Route, RouteNetwork } from "../../Models/Network";
import { QueryParams } from "../../Models/QueryParams";
import RouteIcon from "./RouteIcon";
import SourceWalletPicker from "./SourceWalletPicker";
import DestinationWalletPicker from "./DestinationWalletPicker";
import dynamic from "next/dynamic";
import { Partner } from "../../Models/Partner";

type Props = {
    direction: SwapDirection,
    label: string,
    className?: string,
    partner?: Partner
}
const Address = dynamic(() => import("../Input/Address"), {
    loading: () => <></>,
});

const GROUP_ORDERS = { "Popular": 1, "Networks": 2, "Other": 10, "Unavailable": 20 };
export const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
const getGroupName = (value: Network, type: 'network', canShowInPopular?: boolean) => {
    if (NetworkSettings.KnownSettings[value.name]?.isFeatured && canShowInPopular) {
        return "Popular";
    }
    else if (type === 'network') {
        return "Networks";
    }
    else {
        return "Other";
    }
}

const NetworkFormField = forwardRef(function NetworkFormField({ direction, label, className }: Props, ref: any) {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = direction

    const { from, to, fromCurrency, toCurrency, destination_address } = values
    const query = useQueryState()
    const { lockFrom, lockTo } = query

    const { routes: allRoutes, networks } = useSettingsState();
    let placeholder = "";
    let searchHint = "";
    let menuItems: (SelectMenuItem<Network>)[];

    const apiClient = new LayerSwapApiClient()

    const resolvedRoutes = allRoutes.map(r => direction == 'from' ? r.source : r.destination)

    const {
        data: routes,
        isLoading,
    } = useSWR<ApiResponse<Route[]>>('/routes', apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const [routesData, setRoutesData] = useState<RouteNetwork[] | undefined>(resolvedRoutes)

    useEffect(() => {
        const directionRoute = routes?.data?.map(r => direction == 'from' ? r.source : r.destination)
        if (!isLoading && routes?.data) setRoutesData(directionRoute)
    }, [routes])

    const routeNetworks = routesData?.map(rd => networks.find(n => n.name == rd.network.name)!)

    if (direction === "from") {
        placeholder = "Source";
        searchHint = "Swap from";
        menuItems = GenerateMenuItems(routeNetworks, direction, !!(from && lockFrom), query);
    }
    else {
        placeholder = "Destination";
        searchHint = "Swap to";
        menuItems = GenerateMenuItems(routeNetworks, direction, !!(to && lockTo), query);
    }

    const value = menuItems.find(x => x.id == (direction === "from" ? from : to)?.name);

    const handleSelect = useCallback((item: SelectMenuItem<Network>) => {
        if (item.baseObject.name === value?.baseObject.name)
            return
        setFieldValue(name, item.baseObject, true)
        const currency = name == "from" ? fromCurrency : toCurrency
        const routesData = (direction == 'from' ? from : to) && routes?.data?.filter(r => (direction === 'from' ? r.source.network.name : r.destination.network.name) === (direction === 'from' ? from?.name : to?.name))
        const fromCurrencies = routesData?.map(r => r.source.token);
        const assetSubstitute = fromCurrencies?.find(a => a.symbol === currency?.symbol)
        if (assetSubstitute) {
            setFieldValue(`${name}Currency`, assetSubstitute, true)
        }
    }, [name, value])

    const isLocked = direction === 'from' ? !!lockFrom : !!lockTo

    return (<div className={`${className}`}>
        <div className="flex justify-between items-center px-3 pt-2">
            <label htmlFor={name} className="block font-medium text-secondary-text text-sm pl-1 py-1">
                {label}
            </label>
            {
                direction === "from" ?
                    <SourceWalletPicker />
                    : <>
                        <span>
                            <Address>{
                                ({ destination, disabled, addressItem, connectedWallet, partner }) => <DestinationWalletPicker destination={destination} disabled={disabled} addressItem={addressItem} connectedWallet={connectedWallet} partner={partner} />
                            }</Address>
                        </span>
                    </>
            }
        </div>
        <div ref={ref} className="p-3 rounded-xl grid grid-flow-row-dense grid-cols-6 items-center gap-2">
            <div className="col-span-4">
                <CommandSelectWrapper
                    disabled={isLocked || isLoading}
                    valueGrouper={groupByType}
                    placeholder={placeholder}
                    setValue={handleSelect}
                    value={value}
                    values={menuItems}
                    searchHint={searchHint}
                    isLoading={isLoading}
                    direction={direction}
                />
            </div>
            <div className="col-span-2 w-full">
                <CurrencyFormField direction={name} />
            </div>
        </div>
    </div >)
});


function groupByType(values: ISelectMenuItem[]) {
    let groups: SelectMenuItemGroup[] = [];
    values.forEach((v) => {
        let group = groups.find(x => x.name == v.group) || new SelectMenuItemGroup({ name: v.group, items: [] });
        group.items.push(v);
        if (!groups.find(x => x.name == v.group)) {
            groups.push(group);
        }
    });

    groups.sort((a, b) => {
        return (GROUP_ORDERS[a.name] || GROUP_ORDERS.Other) - (GROUP_ORDERS[b.name] || GROUP_ORDERS.Other);
    });

    return groups;
}

function GenerateMenuItems(routes: Network[] | undefined, direction: SwapDirection, lock: boolean, query: QueryParams): (SelectMenuItem<Network>)[] {
    const mappedLayers = routes?.map(r => {
        const isAvailable = !lock &&
            (
                // r.tokens?.some(r => r.status === 'active' || r.status === 'not_found') ||
                !query.lockAsset && !query.lockFromAsset && !query.lockToAsset && !query.lockFrom && !query.lockTo && !query.lockNetwork
                // && r.tokens?.some(r => r.status !== 'inactive')
            );

        const order = ResolveNetworkOrder(r, direction)
        const routeNotFound = isAvailable
        // && !r.tokens?.some(r => r.status === 'active');

        const res: SelectMenuItem<Network> = {
            baseObject: r,
            id: r.name,
            name: r.displayName,
            order,
            imgSrc: r.logo,
            isAvailable: isAvailable,
            group: getGroupName(r, 'network', isAvailable && !routeNotFound),
            leftIcon: <RouteIcon direction={direction} isAvailable={true} routeNotFound={false} type="network" />,
        }
        return res;
    })
        .sort(SortAscending)
        .filter((route, index, self) => index === self.findIndex(r => r.name === route.name)) || [];

    return mappedLayers
}

export default NetworkFormField