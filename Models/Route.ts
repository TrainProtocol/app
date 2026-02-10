import { NetworkRoute, NetworkRouteToken } from "./NetworkRoute";

/**
 * Represents a network row with expandable token list
 */
export type NetworkElement = {
    type: 'network';
    route: NetworkRoute;
}

/**
 * Represents a single token within a network (flat or nested)
 */
export type NetworkTokenElement = {
    type: 'network_token' | 'suggested_token';
    route: {
        token: NetworkRouteToken;
        route: NetworkRoute;
    }
}

/**
 * Represents a section title (e.g., "Suggestions", "All Networks")
 */
export type TitleElement = {
    type: 'group_title';
    text: string;
}

/**
 * Represents a token row with expandable network list (grouped by token)
 */
export type GroupedTokenElement = {
    type: 'grouped_token';
    symbol: string;
    items: NetworkTokenElement[];
}

/**
 * Loading skeleton placeholder
 */
export type TokenSkeletonElement = {
    type: 'skeleton_token';
}

/**
 * Union of all possible row elements in the RoutePicker
 */
export type RowElement =
    | NetworkElement
    | NetworkTokenElement
    | TitleElement
    | GroupedTokenElement
    | TokenSkeletonElement;
