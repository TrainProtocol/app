import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { ApiResponse } from "../Models/ApiResponse";
import { NetworkRoute, NetworkRouteToken } from "../Models/NetworkRoute";
import { useSettingsState } from "../context/settings";
import {
    NetworkElement,
    RowElement,
    NetworkTokenElement,
    TitleElement,
    TokenSkeletonElement
} from "../Models/Route";
import LayerSwapApiClient from "../lib/trainApiClient";
import { useQueryState } from "../context/query";
import { Route, Network } from "../Models/Network";
import { filterNetworkRoutesByOpposite, routesToNetworkRoutes } from "../helpers/routeTransforms";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
};

export default function useFormRoutes(
    { direction, values }: Props,
    search?: string,
    suggestionsLimit: number = 4
) {
    const { routes: allNetworkRoutes, isLoading: routesLoading } = useRoutes({ direction, values });
    const query = useQueryState();
    const { lockFrom, lockTo, lockFromAsset, lockToAsset } = query;

    // Apply query-based filtering
    const filteredRoutes = useMemo(() => {
        return filterRoutesByQuery(allNetworkRoutes, direction, {
            lockFrom: !!lockFrom,
            from: query.from,
            lockTo: !!lockTo,
            to: query.to,
            lockFromAsset: !!lockFromAsset,
            fromAsset: query.fromAsset,
            lockToAsset: !!lockToAsset,
            toAsset: query.toAsset,
        });
    }, [allNetworkRoutes, direction, lockFrom, query.from, lockTo, query.to, lockFromAsset, query.fromAsset, lockToAsset, query.toAsset]);

    // Group routes into UI elements
    const routeElements = useMemo(() =>
        groupRoutes({
            routes: filteredRoutes,
            direction,
            search,
            suggestionsLimit,
        }),
        [filteredRoutes, direction, search, suggestionsLimit]
    );

    const selectedRoute = useMemo(() => resolveSelectedRoute(values, direction), [values, direction]);
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction]);

    return useMemo(() => ({
        allRoutes: filteredRoutes,
        isLoading: routesLoading,
        routeElements,
        selectedRoute,
        selectedToken,
    }), [
        filteredRoutes,
        routesLoading,
        routeElements,
        selectedRoute,
        selectedToken
    ]);
}

// ---------- SWR Data Hook ----------

function useRoutesData<T extends object>(
    url: string,
    defaultData: T[],
    fetcher: (url: string) => Promise<ApiResponse<T[]>>
) {
    const { data, isLoading } = useSWR<ApiResponse<T[]>>(url, fetcher, {
        keepPreviousData: true,
        dedupingInterval: 10000,
    });

    const [routes, setRoutes] = useState<T[]>(defaultData);

    useEffect(() => {
        if (!isLoading && data?.data) setRoutes(data.data);
    }, [isLoading, data]);

    return { routes, isLoading };
}

function useRoutes({ direction, values }: Props) {
    const { routes: allRoutes, networks } = useSettingsState();
    const apiClient = new LayerSwapApiClient();

    // Fetch routes from API
    const { routes: fetchedRoutes, isLoading } = useRoutesData<Route>(
        '/routes',
        allRoutes || [],
        apiClient.fetcher
    );

    // Transform flat routes to direction-aware NetworkRoute[]
    const networkRoutes = useMemo(() => {
        const oppositeDirection = direction === 'from' ? 'to' : 'from';
        const oppositeNetwork = values[oppositeDirection];
        const oppositeToken = direction === 'from' ? values.toCurrency : values.fromCurrency;

        return filterNetworkRoutesByOpposite(
            fetchedRoutes,
            direction,
            oppositeNetwork,
            oppositeToken,
            networks
        );
    }, [fetchedRoutes, direction, values, networks]);

    return { routes: networkRoutes, isLoading };
}

// ---------- Query-based Filtering ----------

type QueryFilterParams = {
    lockFrom?: boolean;
    from?: string;
    lockTo?: boolean;
    to?: string;
    lockFromAsset?: boolean;
    fromAsset?: string;
    lockToAsset?: boolean;
    toAsset?: string;
};

function filterRoutesByQuery(
    routes: NetworkRoute[],
    direction: SwapDirection,
    queryParams: QueryFilterParams
): NetworkRoute[] {
    const { lockFrom, from, lockTo, to, lockFromAsset, fromAsset, lockToAsset, toAsset } = queryParams;

    const hasNetworkLock = direction === 'from' ? !!lockFrom : !!lockTo;
    const hasAssetLock = direction === 'from' ? !!lockFromAsset : !!lockToAsset;

    if (!hasNetworkLock && !hasAssetLock) return routes;

    // Resolve locked network (case-insensitive) and asset symbol
    const lockedNetworkSlug = direction === 'from'
        ? (lockFrom && from ? from.toLowerCase() : undefined)
        : (lockTo && to ? to.toLowerCase() : undefined);

    const lockedAssetSymbol = direction === 'from'
        ? (lockFromAsset ? fromAsset : undefined)
        : (lockToAsset ? toAsset : undefined);

    if (lockedNetworkSlug) {
        const filteredRoutes = routes.filter(r => r.slug.toLowerCase() === lockedNetworkSlug);
        if (lockedAssetSymbol) {
            return filteredRoutes
                .map(route => {
                    const filteredTokens = route.tokens?.filter(t => t.symbol === lockedAssetSymbol) || [];
                    return filteredTokens.length > 0 ? { ...route, tokens: filteredTokens } : null;
                })
                .filter((r): r is NetworkRoute => r !== null);
        }
        return filteredRoutes;
    }

    return routes;
}

// ---------- Route Grouping ----------

type GroupRoutesProps = {
    routes: NetworkRoute[];
    direction: SwapDirection;
    search?: string;
    suggestionsLimit?: number;
}

function groupRoutes({ routes, direction, search, suggestionsLimit = 4 }: GroupRoutesProps): RowElement[] {
    if (search) {
        return resolveSearch(routes, search, direction);
    }

    // Get suggestions (top N by rank)
    const suggestedRoutes = getSuggestedRoutes(routes, direction, suggestionsLimit);

    // Group remaining routes by network
    const groupedNetworks = resolveNetworkRoutes(routes, direction);

    return mergeGroups(suggestedRoutes, groupedNetworks);
}

const mergeGroups = (
    suggestedRoutes: (NetworkTokenElement | TokenSkeletonElement)[],
    allRoutes: NetworkElement[]
) => {
    return [
        ...(suggestedRoutes.length ? [resolveTitle('Suggestions'), ...suggestedRoutes] : []),
        resolveTitle('All Networks'),
        ...allRoutes
    ];
}

const resolveNetworkRoutes = (
    routes: NetworkRoute[],
    direction: SwapDirection
): NetworkElement[] => {
    // Sort routes by rank (trending)
    const sortedRoutes = sortRoutesByRank(routes, direction);

    return sortedRoutes.map(r => ({
        type: 'network',
        route: {
            ...r,
            tokens: sortTokensByRank(r.tokens, direction)
        }
    }));
}

// ---------- Search ----------

function resolveSearch(routes: NetworkRoute[], search: string, direction: SwapDirection): RowElement[] {
    const matchedNetworks = searchInNetworks(routes, search, direction);
    const matchedTokens = searchInTokens(routes, search, direction);

    return [
        ...(matchedNetworks.length ? [resolveTitle('Networks'), ...matchedNetworks] : []),
        ...(matchedTokens.length ? [resolveTitle('Tokens'), ...matchedTokens] : [])
    ];
}

const searchInNetworks = (
    routes: NetworkRoute[],
    search: string,
    direction: SwapDirection
): NetworkElement[] => {
    const lower = search.toLowerCase().trim();

    return routes.filter(r => {
        const slugMatch = r.slug.toLowerCase().includes(lower);
        const displayNameMatch = r.displayName?.toLowerCase().includes(lower);
        return slugMatch || displayNameMatch;
    }).map(r => ({
        type: 'network',
        route: {
            ...r,
            tokens: sortTokensByRank(r.tokens, direction)
        }
    }));
}

const searchInTokens = (
    routes: NetworkRoute[],
    search: string,
    direction: SwapDirection
): NetworkTokenElement[] => {
    const lower = search.toLowerCase().replace(/\s+/g, " ").trim();

    return extractTokenElementsAsSuggested(routes).filter(e => {
        const { token, route } = e.route;

        const symbolMatch = token.symbol.toLowerCase().includes(lower);
        const contractMatch = token.contractAddress?.toLowerCase().includes(lower);

        // Support combo search like "USDC ethereum"
        const splitted = lower.split(' ');
        const firstpart = splitted?.[0];
        const secondpart = splitted?.[1];

        const combo = (firstpart && secondpart) ? (
            (token.symbol.toLowerCase().includes(firstpart) && route.slug.toLowerCase().includes(secondpart))
            ||
            (token.symbol.toLowerCase().includes(secondpart) && route.slug.toLowerCase().includes(firstpart))
            ||
            (token.symbol.toLowerCase().includes(firstpart) && route.displayName.toLowerCase().includes(secondpart))
            ||
            (token.symbol.toLowerCase().includes(secondpart) && route.displayName.toLowerCase().includes(firstpart))
        ) : false;

        return symbolMatch || contractMatch || combo;
    }).sort((a, b) => {
        // Sort by rank
        const rankKey = direction === 'from' ? 'sourceRank' : 'destinationRank';
        const aRank = a.route.token[rankKey] || 999999;
        const bRank = b.route.token[rankKey] || 999999;
        return aRank - bRank;
    });
};

// ---------- Suggestions ----------

function getSuggestedRoutes(
    routes: NetworkRoute[],
    direction: SwapDirection,
    limit: number
): NetworkTokenElement[] {
    const allTokenElements = extractTokenElementsAsSuggested(routes);

    // Sort by rank and take top N
    const sorted = allTokenElements.sort((a, b) => {
        const rankKey = direction === 'from' ? 'sourceRank' : 'destinationRank';
        const aRank = a.route.token[rankKey] || 999999;
        const bRank = b.route.token[rankKey] || 999999;
        return aRank - bRank;
    });

    return sorted.slice(0, limit);
}

function extractTokenElementsAsSuggested(routes: NetworkRoute[]): NetworkTokenElement[] {
    const elements: NetworkTokenElement[] = [];
    for (const route of routes) {
        for (const token of route.tokens || []) {
            elements.push({
                type: 'suggested_token',
                route: { token, route }
            });
        }
    }
    return elements;
}

// ---------- Sorting ----------

function sortRoutesByRank(routes: NetworkRoute[], direction: SwapDirection): NetworkRoute[] {
    return [...routes].sort((a, b) => {
        const rankKey = direction === 'from' ? 'sourceRank' : 'destinationRank';
        const aRank = a[rankKey] || 999999;
        const bRank = b[rankKey] || 999999;

        if (aRank !== bRank) {
            return aRank - bRank;
        }
        return a.displayName.localeCompare(b.displayName);
    });
}

function sortTokensByRank(tokens: NetworkRouteToken[], direction: SwapDirection): NetworkRouteToken[] {
    return [...tokens].sort((a, b) => {
        const rankKey = direction === 'from' ? 'sourceRank' : 'destinationRank';
        const aRank = a[rankKey] || 999999;
        const bRank = b[rankKey] || 999999;

        if (aRank !== bRank) {
            return aRank - bRank;
        }
        return a.symbol.localeCompare(b.symbol);
    });
}

// ---------- Resolvers ----------

function resolveSelectedRoute(values: SwapFormValues, direction: SwapDirection): NetworkRoute | undefined {
    return direction === 'from' ? values.from as any : values.to as any;
}

function resolveSelectedToken(values: SwapFormValues, direction: SwapDirection): NetworkRouteToken | undefined {
    return direction === 'from' ? values.fromCurrency as any : values.toCurrency as any;
}

function resolveTitle(text: string): TitleElement {
    return { type: 'group_title', text };
}
