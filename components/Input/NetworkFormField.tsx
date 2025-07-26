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
import LayerSwapApiClient from "../../lib/layerSwapApiClient";
import { Network } from "../../Models/Network";
import { QueryParams } from "../../Models/QueryParams";
import { resolveNetworkRoutesURL } from "../../helpers/routes";
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
const Address = dynamic(() => import("./Address/index.tsx").then(mod => mod.default), {
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

const NetworkFormField = forwardRef(function NetworkFormField({ direction, label, className, partner }: Props, ref: any) {
    const {
        values,
        setFieldValue,
    } = useFormikContext<SwapFormValues>();
    const name = direction

    const { from, to, fromCurrency, toCurrency, destination_address } = values
    const query = useQueryState()
    const { lockFrom, lockTo } = query

    const { destinationRoutes, sourceRoutes } = useSettingsState();
    let placeholder = "";
    let searchHint = "";
    let menuItems: (SelectMenuItem<Network>)[];

    const networkRoutesURL = resolveNetworkRoutesURL(direction, values)
    const apiClient = new LayerSwapApiClient()

    const {
        data: routes,
        isLoading,
        error
    } = useSWR<ApiResponse<Network[]>>(networkRoutesURL, apiClient.fetcher, { keepPreviousData: true, dedupingInterval: 10000 })

    const [routesData, setRoutesData] = useState<Network[] | undefined>(direction === 'from' ? sourceRoutes : destinationRoutes)

    useEffect(() => {
        if (!isLoading && routes?.data) setRoutesData(routes.data)
    }, [routes])

    if (direction === "from") {
        placeholder = "Source";
        searchHint = "Swap from";
        menuItems = GenerateMenuItems(routesData, direction, !!(from && lockFrom), query);
    }
    else {
        placeholder = "Destination";
        searchHint = "Swap to";
        menuItems = GenerateMenuItems(routesData, direction, !!(to && lockTo), query);
    }

    const value = menuItems.find(x => x.id == (direction === "from" ? from : to)?.name);

    const handleSelect = useCallback((item: SelectMenuItem<Network>) => {
        if (item.baseObject.name === value?.baseObject.name)
            return
        setFieldValue(name, item.baseObject, true)
        const currency = name == "from" ? fromCurrency : toCurrency
        const assetSubstitute = (item.baseObject as Network)?.tokens?.find(a => a.symbol === currency?.symbol)
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
        const isNewlyListed = r?.tokens?.every(t => new Date(t?.listingDate)?.getTime() >= new Date().getTime() - ONE_WEEK);
        const badge = isNewlyListed ? (
            <span className="bg-secondary-50 px-1 rounded text-xs flex items-center">New</span>
        ) : undefined;

        const isAvailable = !lock &&
            (
                // r.tokens?.some(r => r.status === 'active' || r.status === 'not_found') ||
                !query.lockAsset && !query.lockFromAsset && !query.lockToAsset && !query.lockFrom && !query.lockTo && !query.lockNetwork
                // && r.tokens?.some(r => r.status !== 'inactive')
            );

        const order = ResolveNetworkOrder(r, direction, isNewlyListed)
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
            badge,
            leftIcon: <RouteIcon direction={direction} isAvailable={true} routeNotFound={false} type="network" />,
        }
        return res;
    }).sort(SortAscending) || [];

    return mappedLayers
}

export default NetworkFormField