import { Network as WidgetNetwork, NetworkType } from "@layerswap/widget-types";
import { Network, NetworkTypes, type ExtendedNetwork } from "@/Models/Network";

type TrainNetwork = Network & Partial<Pick<ExtendedNetwork, "nodes">>;

export function toWidgetNetwork<T extends TrainNetwork>(network: T) {
    const { nodes, ...rest } = network;
    return Object.assign(new WidgetNetwork(), rest, {
        type: network.networkType === NetworkTypes.EVM ? NetworkType.EVM : (network.networkType as NetworkType),
        nodes: nodes?.map(node => node.url),
    });
}
