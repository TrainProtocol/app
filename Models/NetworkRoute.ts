import { Network, Token } from "./Network";

/**
 * Extended Token with optional ranking info for source/destination
 */
export class NetworkRouteToken extends Token {
    sourceRank?: number;
    destinationRank?: number;
}

/**
 * Network extended with direction-filtered tokens
 * This is computed client-side from Route[] based on the selected direction
 */
export class NetworkRoute extends Network {
    tokens: NetworkRouteToken[];
}
