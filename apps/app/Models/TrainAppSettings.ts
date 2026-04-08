import { ExtendedNetwork } from "./Network";
import { TrainSettings } from "./TrainSettings";

export class TrainAppSettings {
    constructor(settings: TrainSettings) {
        this.networks = settings.networks;
    }

    networks: ExtendedNetwork[]
}
