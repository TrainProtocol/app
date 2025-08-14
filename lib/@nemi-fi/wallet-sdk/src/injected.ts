import { readonly, writable, type Writable } from "svelte/store";
import { startAzguardEip6963Announcing } from "./azguard";
import type { Eip6963ProviderDetail, IConnector } from "./base";
import type { TypedEip1193Provider } from "./types";

export class InjectedConnector implements IConnector {
  readonly #account = writable<string | undefined>(undefined);
  readonly accountObservable = readonly(this.#account);

  constructor(private detail: Eip6963ProviderDetail) {}

  async connect() {
    const [address] = await this.provider.request({
      method: "aztec_requestAccounts",
      params: [],
    });
    this.#account.set(address);
    return address;
  }

  async reconnect() {
    const [address] = await this.provider.request({
      method: "aztec_accounts",
      params: [],
    });
    this.#account.set(address);
    return address;
  }

  async disconnect() {
    this.#account.set(undefined);
  }

  get info() {
    return this.detail.info;
  }

  get provider(): TypedEip1193Provider {
    return this.detail.provider as TypedEip1193Provider;
  }
}

let providers: Writable<readonly Eip6963ProviderDetail[]>;
export function requestEip6963Providers() {
  if (providers) {
    // request only once
    return readonly(providers);
  }

  // TODO: nuke this when azguard properly implements EIP-6963
  startAzguardEip6963Announcing();

  providers = writable<readonly Eip6963ProviderDetail[]>([]);

  if (typeof window === "undefined") {
    // no effect on server
    return readonly(providers);
  }

  // request providers
  window.addEventListener(AZTEC_EIP6963_ANNOUNCE_PROVIDER, (event: any) => {
    const detail = {
      info: event?.detail?.info,
      provider: event?.detail?.provider,
    };
    if (!detail.info || !detail.provider) {
      console.warn("got invalid Aztec EIP6963 announce", detail);
      return;
    }
    providers.update((providers) => [...providers, detail]);
  });

  window.dispatchEvent(new CustomEvent(AZTEC_EIP6963_REQUEST_PROVIDERS));

  return readonly(providers);
}

const AZTEC_EIP6963_PREFIX = "azip6963"; // deviate from EIP-6963 spec to not clash with EVM wallets
export const AZTEC_EIP6963_REQUEST_PROVIDERS = `${AZTEC_EIP6963_PREFIX}:requestProviders`;
export const AZTEC_EIP6963_ANNOUNCE_PROVIDER = `${AZTEC_EIP6963_PREFIX}:announceProvider`;
