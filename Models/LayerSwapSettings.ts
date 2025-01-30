import { NetworkWithTokens, RouteNetwork } from "./Network";

export class LayerSwapSettings {
    networks: NetworkWithTokens[];
    sourceRoutes?: RouteNetwork[];
    destinationRoutes?: RouteNetwork[];
};