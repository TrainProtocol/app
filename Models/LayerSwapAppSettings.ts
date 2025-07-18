import { Network, Route } from "./Network";
import { LayerSwapSettings } from "./LayerSwapSettings";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {

        this.networks = settings.networks;
        this.routes = settings.routes || []
    }

    networks: Network[]
    routes: Route[]
}
