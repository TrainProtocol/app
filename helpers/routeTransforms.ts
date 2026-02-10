import { Network, Route, Token } from "../Models/Network";
import { NetworkRoute, NetworkRouteToken } from "../Models/NetworkRoute";
import { SwapDirection } from "../components/DTOs/SwapFormValues";

/**
 * Transforms Train's flat Route[] into direction-aware NetworkRoute[]
 *
 * @param routes - Flat routes from Train's API
 * @param direction - "from" or "to"
 * @param networks - All available networks (for full network data)
 * @returns NetworkRoute[] - Networks with direction-filtered tokens embedded
 */
export function routesToNetworkRoutes(
    routes: Route[],
    direction: SwapDirection,
    networks: Network[]
): NetworkRoute[] {
    // Group routes by the network on the specified direction side
    const networkTokenMap = new Map<string, NetworkRouteToken[]>();

    routes.forEach(route => {
        const routeNetwork = direction === 'from' ? route.source : route.destination;
        const networkSlug = routeNetwork.network.slug;
        const token = routeNetwork.token;

        if (!networkTokenMap.has(networkSlug)) {
            networkTokenMap.set(networkSlug, []);
        }

        const tokens = networkTokenMap.get(networkSlug)!;

        // Check if token already exists (deduplicate by symbol + contractAddress)
        const existingToken = tokens.find(t =>
            t.symbol === token.symbol &&
            t.contractAddress === token.contractAddress
        );

        if (!existingToken) {
            // Create NetworkRouteToken with optional ranking
            const networkRouteToken: NetworkRouteToken = {
                ...token,
                sourceRank: direction === 'from' ? tokens.length : undefined,
                destinationRank: direction === 'to' ? tokens.length : undefined,
            };
            tokens.push(networkRouteToken);
        }
    });

    // Build NetworkRoute[] from the grouped data
    const networkRoutes: NetworkRoute[] = [];

    networkTokenMap.forEach((tokens, networkSlug) => {
        const fullNetwork = networks.find(n => n.slug === networkSlug);

        if (fullNetwork) {
            const networkRoute: NetworkRoute = {
                ...fullNetwork,
                tokens
            };
            networkRoutes.push(networkRoute);
        }
    });

    return networkRoutes;
}

/**
 * Filters NetworkRoute[] based on the opposite direction's selection
 *
 * @param routes - All routes from API
 * @param direction - Current picker direction
 * @param oppositeNetwork - Selected network on opposite side
 * @param oppositeToken - Selected token on opposite side
 * @param networks - All available networks
 * @returns NetworkRoute[] - Filtered to only show valid pairs
 */
export function filterNetworkRoutesByOpposite(
    routes: Route[],
    direction: SwapDirection,
    oppositeNetwork: Network | undefined,
    oppositeToken: Token | undefined,
    networks: Network[]
): NetworkRoute[] {
    if (!oppositeNetwork || !oppositeToken) {
        // No filtering needed if opposite side not selected
        return routesToNetworkRoutes(routes, direction, networks);
    }

    // Filter routes that have a valid pairing with the opposite selection
    const filteredRoutes = routes.filter(route => {
        const oppositeRouteNetwork = direction === 'from' ? route.destination : route.source;

        return (
            oppositeRouteNetwork.network.slug === oppositeNetwork.slug &&
            oppositeRouteNetwork.token.symbol === oppositeToken.symbol
        );
    });

    return routesToNetworkRoutes(filteredRoutes, direction, networks);
}
