import { useMemo } from "react";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { useSettingsState } from "../context/settings";
import {
    NetworkElement,
    RowElement,
    NetworkTokenElement,
    TitleElement,
    GroupedTokenElement,
    TokenSkeletonElement,
} from "../Models/Route";
import { useQueryState } from "../context/query";
import { Network, Token } from "../Models/Network";
import { NetworkBalance } from "../Models/Balance";
import { useRouteSortingStore, SortingOption } from "@/stores/routeSortingStore";
import { useRouteTokenSwitchStore } from "@/stores/routeTokenSwitchStore";
import { useRecentNetworksStore, RoutesHistory } from "@/stores/recentRoutesStore";
import useAllWithdrawalBalances from "./useAllWithdrawalBalances";

type Props = {
    direction: SwapDirection;
    values: SwapFormValues;
};

export default function useFormNetworks(
    { direction, values }: Props,
    search?: string,
    suggestionsLimit: number = 4
) {
    const { networks } = useSettingsState();
    const query = useQueryState();
    const { lockFrom, lockTo, lockFromAsset, lockToAsset } = query;

    const groupByToken = useRouteTokenSwitchStore(s => s.showTokens);
    const sortingOption = useRouteSortingStore(s => s.sortingOption);
    const { balances, isLoading, partialPublished } = useAllWithdrawalBalances();
    const routesHistory = useRecentNetworksStore(s => s.recentRoutes);
    const loadingSuggestions = !partialPublished && isLoading && direction === "from";

    // Apply query-based filtering (for locked params only)
    const filteredNetworks = useMemo(() => {
        return filterNetworksByQuery(networks, direction, {
            lockFrom: !!lockFrom,
            from: query.from,
            lockTo: !!lockTo,
            to: query.to,
            lockFromAsset: !!lockFromAsset,
            fromAsset: query.fromAsset,
            lockToAsset: !!lockToAsset,
            toAsset: query.toAsset,
        });
    }, [networks, direction, lockFrom, query.from, lockTo, query.to, lockFromAsset, query.fromAsset, lockToAsset, query.toAsset]);

    // Group networks into UI elements
    const networkElements = useMemo(() =>
        groupNetworks({
            networks: filteredNetworks,
            direction,
            balances,
            groupBy: groupByToken ? "token" : "network",
            recents: routesHistory,
            balancesLoading: loadingSuggestions,
            search,
            suggestionsLimit,
            sortingOption,
        }),
        [filteredNetworks, direction, balances, groupByToken, routesHistory, loadingSuggestions, search, suggestionsLimit, sortingOption]
    );

    const selectedNetwork = useMemo(() => resolveSelectedNetwork(values, direction), [values, direction]);
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction]);

    return useMemo(() => ({
        allNetworks: filteredNetworks,
        isLoading: false,
        networkElements,
        selectedNetwork,
        selectedToken,
    }), [
        filteredNetworks,
        networkElements,
        selectedNetwork,
        selectedToken
    ]);
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

function filterNetworksByQuery(
    networks: Network[],
    direction: SwapDirection,
    queryParams: QueryFilterParams
): Network[] {
    const { lockFrom, from, lockTo, to, lockFromAsset, fromAsset, lockToAsset, toAsset } = queryParams;

    const hasNetworkLock = direction === 'from' ? !!lockFrom : !!lockTo;
    const hasAssetLock = direction === 'from' ? !!lockFromAsset : !!lockToAsset;

    if (!hasNetworkLock && !hasAssetLock) return networks;

    const lockedNetworkSlug = direction === 'from'
        ? (lockFrom && from ? from.toLowerCase() : undefined)
        : (lockTo && to ? to.toLowerCase() : undefined);

    const lockedAssetSymbol = direction === 'from'
        ? (lockFromAsset ? fromAsset : undefined)
        : (lockToAsset ? toAsset : undefined);

    if (lockedNetworkSlug) {
        const filtered = networks.filter(n => n.caip2Id.toLowerCase() === lockedNetworkSlug);
        if (lockedAssetSymbol) {
            return filtered.map(network => ({
                ...network,
                tokens: network.tokens.filter(t => t.symbol === lockedAssetSymbol)
            })).filter(n => n.tokens.length > 0);
        }
        return filtered;
    }

    return networks;
}

// ---------- Network Grouping ----------

type GroupNetworksProps = {
    networks: Network[];
    direction: SwapDirection;
    balances: Record<string, NetworkBalance> | null;
    groupBy: 'token' | 'network';
    recents: RoutesHistory;
    balancesLoading: boolean;
    search?: string;
    suggestionsLimit?: number;
    sortingOption?: SortingOption;
}

function groupNetworks({
    networks,
    direction,
    balances,
    groupBy,
    recents,
    balancesLoading,
    search,
    suggestionsLimit = 4,
    sortingOption = SortingOption.RELEVANCE,
}: GroupNetworksProps): RowElement[] {
    if (search) {
        return resolveSearch(networks, search, direction, balances, recents);
    }

    const suggestedTokens = getSuggestedTokens(networks, balances, recents, direction, balancesLoading, suggestionsLimit);

    if (groupBy === "token") {
        const groupedTokens = resolveTokenNetworks(networks, balances, direction, recents, sortingOption);
        return mergeGroups(suggestedTokens, groupedTokens);
    }

    const groupedNetworks = resolveNetworkElements(networks, balances, direction, recents, sortingOption);
    return mergeGroups(suggestedTokens, groupedNetworks);
}

const mergeGroups = (
    suggestedTokens: (NetworkTokenElement | TokenSkeletonElement)[],
    allRoutes: GroupedTokenElement[] | NetworkElement[]
) => {
    const allRoutesTitle = allRoutes.find(() => true)?.type === "grouped_token" ? 'All Tokens' : 'All Networks';
    return [
        ...(suggestedTokens.length ? [resolveTitle('Suggestions'), ...suggestedTokens] : []),
        resolveTitle(allRoutesTitle),
        ...allRoutes
    ];
}

// ---------- Network Mode ----------

const resolveNetworkElements = (
    networks: Network[],
    balances: Record<string, NetworkBalance> | null,
    direction: SwapDirection,
    routesHistory: RoutesHistory,
    sortingOption: SortingOption = SortingOption.RELEVANCE
): NetworkElement[] => {
    const sortedNetworks = sortNetworks(networks, sortingOption, direction, balances, routesHistory);
    return sortedNetworks.map(n => ({
        type: 'network' as const,
        network: {
            ...n,
            tokens: sortTokens(n.tokens, n, sortingOption, direction, balances, routesHistory)
        }
    }));
}

// ---------- Token Mode ----------

const resolveTokenNetworks = (
    networks: Network[],
    balances: Record<string, NetworkBalance> | null,
    direction: SwapDirection,
    routesHistory: RoutesHistory,
    sortingOption: SortingOption = SortingOption.RELEVANCE
): GroupedTokenElement[] => {
    const grouped = groupByTokens(networks);
    return sortGroupedTokens(grouped, sortingOption, direction, balances, routesHistory);
}

function groupByTokens(networks: Network[]): GroupedTokenElement[] {
    const tokenMap: Record<string, NetworkTokenElement[]> = {};
    for (const network of networks) {
        for (const token of network.tokens || []) {
            const el: NetworkTokenElement = { type: 'network_token', data: { token, network } };
            if (!tokenMap[token.symbol]) tokenMap[token.symbol] = [];
            tokenMap[token.symbol].push(el);
        }
    }
    return Object.entries(tokenMap).map(([symbol, items]) => ({
        type: 'grouped_token' as const,
        symbol,
        items
    }));
}

// ---------- Search ----------

function resolveSearch(
    networks: Network[],
    search: string,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): RowElement[] {
    const matchedNetworks = searchInNetworks(networks, search, direction, balances);
    const matchedTokens = searchInTokens(networks, search)
        .sort(sortSuggestedTokenElements(direction, balances, routesHistory));
    return [
        ...(matchedNetworks.length ? [resolveTitle('Networks'), ...matchedNetworks] : []),
        ...(matchedTokens.length ? [resolveTitle('Tokens'), ...matchedTokens] : [])
    ];
}

const searchInNetworks = (
    networks: Network[],
    search: string,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null
): NetworkElement[] => {
    const lower = search.toLowerCase().trim();

    return networks.filter(n => {
        const slugMatch = n.caip2Id.toLowerCase().includes(lower);
        const displayNameMatch = n.displayName?.toLowerCase().includes(lower);
        return slugMatch || displayNameMatch;
    }).map(n => ({
        type: 'network' as const,
        network: {
            ...n,
            tokens: (direction === "from" && balances)
                ? sortNetworkTokensByBalance(n, balances)
                : [...n.tokens].sort((a, b) => a.symbol.localeCompare(b.symbol))
        }
    }));
}

const searchInTokens = (networks: Network[], search: string): NetworkTokenElement[] => {
    const lower = search.toLowerCase().replace(/\s+/g, " ").trim();
    const elements: NetworkTokenElement[] = [];

    networks.forEach(network => {
        network.tokens.forEach(token => {
            const symbolMatch = token.symbol.toLowerCase().includes(lower);
            const contractMatch = token.contract?.toLowerCase().includes(lower);

            const splitted = lower.split(' ');
            const firstpart = splitted?.[0];
            const secondpart = splitted?.[1];

            const combo = (firstpart && secondpart) ? (
                (token.symbol.toLowerCase().includes(firstpart) && network.caip2Id.toLowerCase().includes(secondpart))
                ||
                (token.symbol.toLowerCase().includes(secondpart) && network.caip2Id.toLowerCase().includes(firstpart))
                ||
                (token.symbol.toLowerCase().includes(firstpart) && network.displayName.toLowerCase().includes(secondpart))
                ||
                (token.symbol.toLowerCase().includes(secondpart) && network.displayName.toLowerCase().includes(firstpart))
            ) : false;

            if (symbolMatch || contractMatch || combo) {
                elements.push({
                    type: 'suggested_token' as const,
                    data: { token, network }
                });
            }
        });
    });

    return elements;
};

// ---------- Suggestions ----------

function getSuggestedTokens(
    networks: Network[],
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection,
    balancesLoading: boolean,
    limit: number
): (NetworkTokenElement | TokenSkeletonElement)[] {
    const effectiveLimit = Math.max(4, limit);

    if (direction === "from") {
        if (!balancesLoading && !balances) return [];
        if (balancesLoading) return Array(effectiveLimit).fill({ type: "skeleton_token" as const });
    }

    const tokenElements = extractTokenElementsAsSuggested(networks);
    const sorted = tokenElements.sort(sortSuggestedTokenElements(direction, balances, routesHistory));
    return sorted.slice(0, effectiveLimit);
}

const extractTokenElementsAsSuggested = (networks: Network[]): NetworkTokenElement[] =>
    networks.flatMap(network =>
        (network.tokens || []).map(token => ({
            type: 'suggested_token' as const,
            data: { token, network }
        }))
    );

const sortSuggestedTokenElements = (
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
) => (a: NetworkTokenElement, b: NetworkTokenElement) => {
    if (direction === "from" && balances) {
        const aBalance = getNetworkTokenElementBalance(a, balances);
        const bBalance = getNetworkTokenElementBalance(b, balances);
        if (aBalance !== bBalance) return bBalance - aBalance;
    }
    if (routesHistory) {
        const aUsed = getUsedCount(a, routesHistory, direction);
        const bUsed = getUsedCount(b, routesHistory, direction);
        if (aUsed !== bUsed) return bUsed - aUsed;
    }
    // Fallback: sort by price descending, then alphabetical
    const aPrice = a.data.token.priceInUsd ?? 0;
    const bPrice = b.data.token.priceInUsd ?? 0;
    if (aPrice !== bPrice) return bPrice - aPrice;
    return a.data.token.symbol.localeCompare(b.data.token.symbol);
}

const getNetworkTokenElementBalance = (item: NetworkTokenElement, balances: Record<string, NetworkBalance>) => {
    return (balances[item.data.network.caip2Id]?.balances?.find(b => b.token === item.data.token.symbol)?.amount || 0) * (item.data.token.priceInUsd || 0);
}

const getUsedCount = (item: NetworkTokenElement, history: RoutesHistory, direction: SwapDirection) => {
    return direction === "from"
        ? history.sourceRoutes?.[item.data.network.caip2Id]?.[item.data.token.symbol] || 0
        : history.destinationRoutes?.[item.data.network.caip2Id]?.[item.data.token.symbol] || 0;
}

// ---------- Sorting ----------

const BALANCE_EPSILON = 0.001; // sub-cent threshold for floating-point comparison

function resolveTokenUSDBalance(network: Network, token: Token, balances: Record<string, NetworkBalance>): number {
    const networkBalance = balances?.[network.caip2Id]?.balances || [];
    const match = networkBalance.find(b => b.token === token.symbol);
    return match?.amount && match.amount > 0 ? match.amount * (token.priceInUsd || 0) : 0;
}

function sortNetworks(
    networks: Network[],
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): Network[] {
    switch (sortingOption) {
        case SortingOption.RELEVANCE:
            return sortNetworksByRelevance(networks, balances, routesHistory, direction);
        case SortingOption.MOST_USED:
            return sortNetworksByMostUsed(networks, routesHistory, direction);
        case SortingOption.TRENDING:
        case SortingOption.ALPHABETICAL_ASC:
            return sortNetworksAlphabetically(networks, true);
        case SortingOption.ALPHABETICAL_DESC:
            return sortNetworksAlphabetically(networks, false);
        default:
            return networks;
    }
}

function sortNetworksByRelevance(
    networks: Network[],
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): Network[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const history = routesHistory[historyKey] || {};

    const balanceMap = new Map<string, number>();
    if (direction === 'from' && balances) {
        for (const network of networks) {
            const networkBal = balances[network.caip2Id];
            const total = networkBal?.balances?.reduce((sum, b) => {
                const token = network.tokens.find(t => t.symbol === b.token);
                return sum + ((b.amount || 0) * (token?.priceInUsd || 0));
            }, 0) || 0;
            balanceMap.set(network.caip2Id, total);
        }
    }

    const usageMap = new Map<string, number>();
    for (const network of networks) {
        usageMap.set(network.caip2Id, Object.values(history[network.caip2Id] || {}).reduce((sum, count) => sum + count, 0));
    }

    return [...networks].sort((a, b) => {
        if (direction === 'from' && balances) {
            const balanceDiff = (balanceMap.get(b.caip2Id) || 0) - (balanceMap.get(a.caip2Id) || 0);
            if (Math.abs(balanceDiff) > BALANCE_EPSILON) return balanceDiff;
        }

        const aUsage = usageMap.get(a.caip2Id) || 0;
        const bUsage = usageMap.get(b.caip2Id) || 0;
        if (aUsage !== bUsage) return bUsage - aUsage;

        return a.displayName.localeCompare(b.displayName);
    });
}

function sortNetworksByMostUsed(
    networks: Network[],
    routesHistory: RoutesHistory,
    direction: SwapDirection
): Network[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const history = routesHistory[historyKey] || {};

    const usageMap = new Map<string, number>();
    for (const network of networks) {
        usageMap.set(network.caip2Id, Object.values(history[network.caip2Id] || {}).reduce((sum, count) => sum + count, 0));
    }

    return [...networks].sort((a, b) => {
        const aUsage = usageMap.get(a.caip2Id) || 0;
        const bUsage = usageMap.get(b.caip2Id) || 0;
        if (bUsage !== aUsage) return bUsage - aUsage;
        return a.displayName.localeCompare(b.displayName);
    });
}

function sortNetworksAlphabetically(networks: Network[], ascending: boolean): Network[] {
    return [...networks].sort((a, b) => {
        const comparison = a.displayName.localeCompare(b.displayName);
        return ascending ? comparison : -comparison;
    });
}

function sortTokens(
    tokens: Token[],
    network: Network,
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): Token[] {
    switch (sortingOption) {
        case SortingOption.RELEVANCE:
            return sortTokensByRelevance(tokens, network, balances, routesHistory, direction);
        case SortingOption.MOST_USED:
            return sortTokensByMostUsed(tokens, network, routesHistory, direction);
        case SortingOption.TRENDING:
        case SortingOption.ALPHABETICAL_ASC:
            return [...tokens].sort((a, b) => a.symbol.localeCompare(b.symbol));
        case SortingOption.ALPHABETICAL_DESC:
            return [...tokens].sort((a, b) => b.symbol.localeCompare(a.symbol));
        default:
            return tokens;
    }
}

function sortTokensByRelevance(
    tokens: Token[],
    network: Network,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): Token[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const routeHistory = routesHistory[historyKey]?.[network.caip2Id] || {};

    return [...tokens].sort((a, b) => {
        if (direction === 'from' && balances) {
            const aBalance = resolveTokenUSDBalance(network, a, balances);
            const bBalance = resolveTokenUSDBalance(network, b, balances);
            const balanceDiff = bBalance - aBalance;
            if (Math.abs(balanceDiff) > BALANCE_EPSILON) return balanceDiff;
        }

        const aUsage = routeHistory[a.symbol] || 0;
        const bUsage = routeHistory[b.symbol] || 0;
        if (aUsage !== bUsage) return bUsage - aUsage;

        return a.symbol.localeCompare(b.symbol);
    });
}

function sortTokensByMostUsed(
    tokens: Token[],
    network: Network,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): Token[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const routeHistory = routesHistory[historyKey]?.[network.caip2Id] || {};

    return [...tokens].sort((a, b) => {
        const aUsage = routeHistory[a.symbol] || 0;
        const bUsage = routeHistory[b.symbol] || 0;
        if (bUsage !== aUsage) return bUsage - aUsage;
        return a.symbol.localeCompare(b.symbol);
    });
}

function sortNetworkTokensByBalance(network: Network, balances: Record<string, NetworkBalance>): Token[] {
    return [...(network.tokens || [])].sort((a, b) => {
        const balanceA = resolveTokenUSDBalance(network, a, balances);
        const balanceB = resolveTokenUSDBalance(network, b, balances);
        if (balanceB !== balanceA) return balanceB - balanceA;
        return a.symbol.localeCompare(b.symbol);
    });
}

function sortGroupedTokens(
    tokenElements: GroupedTokenElement[],
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): GroupedTokenElement[] {
    const groupsWithSortedItems = tokenElements.map(group => {
        const sortedItems = sortGroupedTokenItems(group.items, sortingOption, direction, balances, routesHistory);
        const totalUSD = balances
            ? sortedItems.reduce((sum, item) => sum + resolveTokenUSDBalance(item.data.network, item.data.token, balances), 0)
            : 0;
        return { ...group, items: sortedItems, totalUSD };
    });

    switch (sortingOption) {
        case SortingOption.RELEVANCE:
            return sortGroupedTokensByRelevance(groupsWithSortedItems, balances, routesHistory, direction);
        case SortingOption.MOST_USED: {
            const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
            const history = routesHistory[historyKey] || {};
            const historyValues = Object.values(history);
            const symbolUsageMap = new Map<string, number>();
            for (const g of groupsWithSortedItems) {
                symbolUsageMap.set(g.symbol, historyValues.reduce((sum, routes) => sum + (routes[g.symbol] || 0), 0));
            }
            return groupsWithSortedItems.sort((a, b) => {
                const aUsage = symbolUsageMap.get(a.symbol) || 0;
                const bUsage = symbolUsageMap.get(b.symbol) || 0;
                return bUsage - aUsage || a.symbol.localeCompare(b.symbol);
            });
        }
        case SortingOption.TRENDING:
        case SortingOption.ALPHABETICAL_ASC:
            return groupsWithSortedItems.sort((a, b) => a.symbol.localeCompare(b.symbol));
        case SortingOption.ALPHABETICAL_DESC:
            return groupsWithSortedItems.sort((a, b) => b.symbol.localeCompare(a.symbol));
        default:
            return groupsWithSortedItems;
    }
}

function sortGroupedTokenItems(
    items: NetworkTokenElement[],
    sortingOption: SortingOption,
    direction: SwapDirection,
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory
): NetworkTokenElement[] {
    switch (sortingOption) {
        case SortingOption.RELEVANCE:
            return sortTokenItemsByRelevance(items, balances, routesHistory, direction);
        case SortingOption.MOST_USED: {
            const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
            return [...items].sort((a, b) => {
                const aUsage = routesHistory[historyKey]?.[a.data.network.caip2Id]?.[a.data.token.symbol] || 0;
                const bUsage = routesHistory[historyKey]?.[b.data.network.caip2Id]?.[b.data.token.symbol] || 0;
                return bUsage - aUsage || a.data.network.displayName.localeCompare(b.data.network.displayName);
            });
        }
        case SortingOption.TRENDING:
        case SortingOption.ALPHABETICAL_ASC:
            return [...items].sort((a, b) => a.data.network.displayName.localeCompare(b.data.network.displayName));
        case SortingOption.ALPHABETICAL_DESC:
            return [...items].sort((a, b) => b.data.network.displayName.localeCompare(a.data.network.displayName));
        default:
            return items;
    }
}

function sortGroupedTokensByRelevance(
    groups: (GroupedTokenElement & { totalUSD: number })[],
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): GroupedTokenElement[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';
    const history = routesHistory[historyKey] || {};
    const historyValues = Object.values(history);
    const symbolUsageMap = new Map<string, number>();
    for (const g of groups) {
        symbolUsageMap.set(g.symbol, historyValues.reduce((sum, routes) => sum + (routes[g.symbol] || 0), 0));
    }

    return [...groups].sort((a, b) => {
        if (direction === 'from') {
            const usdDiff = b.totalUSD - a.totalUSD;
            if (Math.abs(usdDiff) > BALANCE_EPSILON) return usdDiff;
        }

        const aUsage = symbolUsageMap.get(a.symbol) || 0;
        const bUsage = symbolUsageMap.get(b.symbol) || 0;
        if (aUsage !== bUsage) return bUsage - aUsage;

        return a.symbol.localeCompare(b.symbol);
    });
}

function sortTokenItemsByRelevance(
    items: NetworkTokenElement[],
    balances: Record<string, NetworkBalance> | null,
    routesHistory: RoutesHistory,
    direction: SwapDirection
): NetworkTokenElement[] {
    const historyKey = direction === 'from' ? 'sourceRoutes' : 'destinationRoutes';

    return [...items].sort((a, b) => {
        if (direction === 'from' && balances) {
            const aBalance = resolveTokenUSDBalance(a.data.network, a.data.token, balances);
            const bBalance = resolveTokenUSDBalance(b.data.network, b.data.token, balances);
            const balanceDiff = bBalance - aBalance;
            if (Math.abs(balanceDiff) > BALANCE_EPSILON) return balanceDiff;
        }

        const aUsage = routesHistory[historyKey]?.[a.data.network.caip2Id]?.[a.data.token.symbol] || 0;
        const bUsage = routesHistory[historyKey]?.[b.data.network.caip2Id]?.[b.data.token.symbol] || 0;
        if (aUsage !== bUsage) return bUsage - aUsage;

        return a.data.network.displayName.localeCompare(b.data.network.displayName);
    });
}

// ---------- Resolvers ----------

function resolveSelectedNetwork(values: SwapFormValues, direction: SwapDirection): Network | undefined {
    return direction === 'from' ? values.from as any : values.to as any;
}

function resolveSelectedToken(values: SwapFormValues, direction: SwapDirection): Token | undefined {
    return direction === 'from' ? values.fromCurrency : values.toCurrency;
}

function resolveTitle(text: string): TitleElement {
    return { type: 'group_title', text };
}
