import type { AztecNode } from "@aztec/aztec.js";
import { uniqBy } from "lodash-es";
import { persisted } from "svelte-persisted-store";
import { reactive } from "svelte-reactive";
import {
  derived,
  get,
  readonly,
  writable,
  type Readable,
  type Writable,
} from "svelte/store";
import type { AsyncOrSync } from "ts-essentials";
import {
  LiteralArtifactStrategy,
  type IArtifactStrategy,
} from "./artifacts";
import type { FallbackOpenPopup } from "./Communicator";
import type { Account } from "./exports/index";
import { InjectedConnector, requestEip6963Providers } from "./injected";
import type { Eip1193Provider, RpcRequestMap } from "./types";
import { getAvmChain, resolveAztecNode } from "./utils";
import { Eip1193Account } from "./exports/eip1193";

export class AztecWalletSdk {
  readonly #aztecNode: () => Promise<AztecNode>;
  readonly #account = writable<Account | undefined>(undefined);
  readonly accountObservable = readonly(this.#account);

  readonly #currentConnectorUuid = persisted<string | null>(
    "aztec-wallet-current-connector-uuid",
    null,
  );
  readonly #specifiedConnectors: Writable<readonly IConnector[]>;
  readonly #injectedConnectors: Readable<readonly IConnector[]>;
  readonly #connectors: Readable<readonly IConnector[]>;
  readonly #currentConnector: Readable<IConnector | undefined>;
  readonly fallbackOpenPopup: FallbackOpenPopup | undefined;

  constructor(params: {
    aztecNode: AztecNodeInput;
    connectors: (IConnector | ((sdk: AztecWalletSdk) => IConnector))[];
    fallbackOpenPopup?: FallbackOpenPopup;
  }) {
    this.#aztecNode = resolveAztecNode(params.aztecNode);
    this.fallbackOpenPopup = params.fallbackOpenPopup;

    this.#specifiedConnectors = writable(
      params.connectors.map((x) => (typeof x === "function" ? x(this) : x)),
    );
    this.#injectedConnectors = derived(requestEip6963Providers(), (providers) =>
      providers.map((p) => new InjectedConnector(p)),
    );
    this.#connectors = reactive(($) =>
      uniqBy(
        [...$(this.#specifiedConnectors), ...$(this.#injectedConnectors)],
        (x) => x.info.uuid,
      ),
    );
    this.#currentConnector = reactive(($) => {
      const currentConnectorUuid = $(this.#currentConnectorUuid);
      const connector = $(this.#connectors).find(
        (a) => a.info.uuid === currentConnectorUuid,
      );

      // side effect. Is this correct?
      if (connector) {
        connector.reconnect();
      }

      return connector;
    });

    const currentAddress = reactive(($) => {
      const connector = $(this.#currentConnector);
      if (!connector) {
        return undefined;
      }
      return $(connector.accountObservable);
    });

    let accountId = 0;
    currentAddress.subscribe(async (address) => {
      const thisAccountId = ++accountId;

      // async code after this line

      const account = address ? await this.#toAccount(address) : undefined;

      // prevent race condition
      if (thisAccountId !== accountId) {
        return;
      }

      this.#account.set(account);
    });

    this.#reconnect();
  }

  /**
   * Returns currently selected account if any.
   */
  getAccount() {
    return get(this.#account);
  }

  async getEip1193Account(): Promise<Eip1193Account | undefined> {
    const account = this.getAccount();
    if (!account) return undefined
    return await this.#toAccount(account?.address.toString());
  }

  async connect(providerUuid: string) {
    this.#currentConnectorUuid.set(providerUuid);
    if (!this.#connector) {
      throw new Error(`no provider found for ${providerUuid}`);
    }
    const address = await this.#connector.connect();
    if (!address) {
      throw new Error("Failed to connect");
    }
    return await this.#toAccount(address);
  }

  async #reconnect() {
    if (!this.#connector) {
      return;
    }
    await this.#connector.reconnect();
  }

  async disconnect() {
    if (!this.#connector) {
      return;
    }
    await this.#connector.disconnect();
  }

  async watchAssets(
    assets: Parameters<RpcRequestMap["wallet_watchAssets"]>[0]["assets"],
  ) {
    await this.#provider.request({
      method: "wallet_watchAssets",
      params: [{ assets }],
    });
  }

  get connectors(): readonly Eip6963ProviderInfo[] {
    return get(this.#connectors).map((x) => ({ ...x.info })); // clone
  }

  aztecNode() {
    return this.#aztecNode;
  }

  get #connector() {
    return get(this.#currentConnector);
  }

  get #provider() {
    if (!this.#connector) {
      throw new Error("provider not connected");
    }
    return this.#connector.provider;
  }

  async #toAccount(address: string) {
    const { AztecAddress } = await import("@aztec/aztec.js");
    const { Eip1193Account } = await import("./exports/eip1193.ts");
    const avmChain = await getAvmChain(await this.#aztecNode());
    return new Eip1193Account(
      AztecAddress.fromString(address),
      this.#provider,
      await this.#aztecNode(),
      this.#connector?.artifactStrategy ?? new LiteralArtifactStrategy(),
      avmChain,
    );
  }
}

export interface IConnector extends Eip6963ProviderDetail {
  readonly accountObservable: Readable<string | undefined>;
  readonly artifactStrategy?: IArtifactStrategy;
  connect(): Promise<string | undefined>;
  reconnect(): Promise<string | undefined>;
  disconnect(): Promise<void>;
}

export interface Eip6963ProviderInfo {
  readonly uuid: string;
  readonly name: string;
  readonly icon: string;
  // readonly rdns: string; // TODO: careful with this field. Check EIP-6963 spec
}

export interface Eip6963ProviderDetail {
  readonly info: Eip6963ProviderInfo;
  readonly provider: Eip1193Provider;
}

export type AztecNodeInput =
  | string
  | URL
  | (() => AsyncOrSync<AztecNode>)
  | AsyncOrSync<AztecNode>;
