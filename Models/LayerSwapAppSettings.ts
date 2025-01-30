import { NetworkWithTokens, RouteNetwork } from "./Network";
import { LayerSwapSettings } from "./LayerSwapSettings";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {

        this.networks = settings.networks;
        this.sourceRoutes = settings.sourceRoutes || []
        this.destinationRoutes = settings.destinationRoutes || []
    }

    networks: NetworkWithTokens[]
    sourceRoutes: RouteNetwork[]
    destinationRoutes: RouteNetwork[]

}
