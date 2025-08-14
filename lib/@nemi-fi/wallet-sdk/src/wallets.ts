import { RemoteArtifactStrategy } from "./artifacts";
import type { AztecWalletSdk } from "./base";
import {
  type ObsidionBridgeConnectorOptions,
  ObsidionBridgeConnector,
} from "./obsidion";

type PartialObsidionPopupConnectorOptions = Partial<
  Pick<ObsidionBridgeConnectorOptions, "walletUrl" | "artifactStrategy">
>;

export function obsidion(params: PartialObsidionPopupConnectorOptions = {}) {
  return (sdk: AztecWalletSdk) =>
    new ObsidionBridgeConnector({
      ...params,
      fallbackOpenPopup: sdk.fallbackOpenPopup,
      walletUrl: params.walletUrl ?? "https://app.obsidion.xyz",
      artifactStrategy:
        params.artifactStrategy ?? RemoteArtifactStrategy.getDefaultSingleton(),

      uuid: "obsidion",
      name: "Obsidion",
      icon: "https://pbs.twimg.com/profile_images/1849068253685116928/MzTzv03r_400x400.jpg",
    });
}
