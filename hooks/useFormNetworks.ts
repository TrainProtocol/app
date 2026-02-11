import { useMemo } from "react";
import { SwapDirection, SwapFormValues } from "../components/DTOs/SwapFormValues";
import { useSettingsState } from "../context/settings";
import {
    NetworkElement,
    RowElement,
    NetworkTokenElement,
    TitleElement,
} from "../Models/Route";
import { useQueryState } from "../context/query";
import { Network, Token } from "../Models/Network";

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
            search,
            suggestionsLimit,
        }),
        [filteredNetworks, direction, search, suggestionsLimit]
    );

    const selectedNetwork = useMemo(() => resolveSelectedNetwork(values, direction), [values, direction]);
    const selectedToken = useMemo(() => resolveSelectedToken(values, direction), [values, direction]);

    return useMemo(() => ({
        allNetworks: filteredNetworks,
        isLoading: false, // No API call needed
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

    // Resolve locked network and asset
    const lockedNetworkSlug = direction === 'from'
        ? (lockFrom && from ? from.toLowerCase() : undefined)
        : (lockTo && to ? to.toLowerCase() : undefined);

    const lockedAssetSymbol = direction === 'from'
        ? (lockFromAsset ? fromAsset : undefined)
        : (lockToAsset ? toAsset : undefined);

    if (lockedNetworkSlug) {
        const filtered = networks.filter(n => n.slug.toLowerCase() === lockedNetworkSlug);
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
    search?: string;
    suggestionsLimit?: number;
}

function groupNetworks({ networks, direction, search, suggestionsLimit = 4 }: GroupNetworksProps): RowElement[] {
    if (search) {
        return resolveSearch(networks, search);
    }

    // Get suggestions (alphabetical for now - can be enhanced with balance-based)
    const suggestedTokens = getSuggestedTokens(networks, suggestionsLimit);

    // Group all networks
    const groupedNetworks = resolveNetworkElements(networks);

    return mergeGroups(suggestedTokens, groupedNetworks);
}

const mergeGroups = (
    suggestedTokens: NetworkTokenElement[],
    allNetworks: NetworkElement[]
) => {
    return [
        ...(suggestedTokens.length ? [resolveTitle('Suggestions'), ...suggestedTokens] : []),
        resolveTitle('All Networks'),
        ...allNetworks
    ];
}

const resolveNetworkElements = (networks: Network[]): NetworkElement[] => {
    // Sort networks alphabetically
    const sorted = [...networks].sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
    );

    return sorted.map(n => ({
        type: 'network' as const,
        network: {
            ...n,
            tokens: [...n.tokens].sort((a, b) => a.symbol.localeCompare(b.symbol))
        }
    }));
}

// ---------- Search ----------

function resolveSearch(networks: Network[], search: string): RowElement[] {
    const matchedNetworks = searchInNetworks(networks, search);
    const matchedTokens = searchInTokens(networks, search);

    return [
        ...(matchedNetworks.length ? [resolveTitle('Networks'), ...matchedNetworks] : []),
        ...(matchedTokens.length ? [resolveTitle('Tokens'), ...matchedTokens] : [])
    ];
}

const searchInNetworks = (networks: Network[], search: string): NetworkElement[] => {
    const lower = search.toLowerCase().trim();

    return networks.filter(n => {
        const slugMatch = n.slug.toLowerCase().includes(lower);
        const displayNameMatch = n.displayName?.toLowerCase().includes(lower);
        return slugMatch || displayNameMatch;
    }).map(n => ({
        type: 'network' as const,
        network: {
            ...n,
            tokens: [...n.tokens].sort((a, b) => a.symbol.localeCompare(b.symbol))
        }
    }));
}

const searchInTokens = (networks: Network[], search: string): NetworkTokenElement[] => {
    const lower = search.toLowerCase().replace(/\s+/g, " ").trim();
    const elements: NetworkTokenElement[] = [];

    networks.forEach(network => {
        network.tokens.forEach(token => {
            const symbolMatch = token.symbol.toLowerCase().includes(lower);
            const contractMatch = token.contractAddress?.toLowerCase().includes(lower);

            // Support combo search like "USDC ethereum"
            const splitted = lower.split(' ');
            const firstpart = splitted?.[0];
            const secondpart = splitted?.[1];

            const combo = (firstpart && secondpart) ? (
                (token.symbol.toLowerCase().includes(firstpart) && network.slug.toLowerCase().includes(secondpart))
                ||
                (token.symbol.toLowerCase().includes(secondpart) && network.slug.toLowerCase().includes(firstpart))
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

    return elements.sort((a, b) =>
        a.data.token.symbol.localeCompare(b.data.token.symbol)
    );
};

// ---------- Suggestions (Alphabetical for now) ----------

function getSuggestedTokens(
    networks: Network[],
    limit: number
): NetworkTokenElement[] {
    const allTokenElements: NetworkTokenElement[] = [];

    networks.forEach(network => {
        network.tokens.forEach(token => {
            allTokenElements.push({
                type: 'suggested_token' as const,
                data: { token, network }
            });
        });
    });

    // Sort alphabetically for now
    // TODO: Enhance with balance-based sorting (tokens with balance first)
    const sorted = allTokenElements.sort((a, b) =>
        a.data.token.symbol.localeCompare(b.data.token.symbol)
    );

    return sorted.slice(0, limit);
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
