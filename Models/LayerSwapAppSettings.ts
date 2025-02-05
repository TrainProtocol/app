import { Network } from "./Network";
import { LayerSwapSettings } from "./LayerSwapSettings";

export class LayerSwapAppSettings {
    constructor(settings: LayerSwapSettings) {

        this.networks = settings.networks;
        this.sourceRoutes = settings.sourceRoutes || []
        this.destinationRoutes = settings.destinationRoutes || []
    }

    networks: Network[]
    sourceRoutes: Network[]
    destinationRoutes: Network[]

}
