import { persisted } from "svelte-persisted-store";
import { derived, type Readable, type Writable } from "svelte/store";
import { assert } from "ts-essentials";
import { joinURL } from "ufo";
import type { Eip6963ProviderInfo, IConnector } from "./base";
import { Communicator, type FallbackOpenPopup } from "./Communicator";
import type { TypedEip1193Provider } from "./types";
import { FINAL_METHODS } from "./utils";

export class PopupConnector implements IConnector {
  readonly info: Eip6963ProviderInfo;
  readonly #communicator: Communicator;

  #pendingRequestsCount = 0;

  readonly #connectedAccountAddress: Writable<string | null>;
  readonly accountObservable: Readable<string | undefined>;

  readonly walletUrl: string;

  constructor(params: PopupConnectorOptions) {
    this.info = { uuid: params.uuid, name: params.name, icon: params.icon };
    this.walletUrl = params.walletUrl;
    this.#communicator = new Communicator({
      url: joinURL(this.walletUrl, "/sign"),
      ...params,
    });

    this.#connectedAccountAddress = persisted<string | null>(
      `aztec-wallet-connected-address-${params.uuid}`,
      null,
    );
    this.accountObservable = derived(
      this.#connectedAccountAddress,
      (x) => x ?? undefined,
    );
  }

  async connect() {
    const result = await this.provider.request({
      method: "aztec_requestAccounts",
      params: [],
    });
    const [address] = result;
    assert(address, "No accounts found");
    this.#connectedAccountAddress.set(address);
    return address;
  }

  async reconnect() {
    return undefined;
  }

  async disconnect() {
    this.#connectedAccountAddress.set(null);
  }

  provider: TypedEip1193Provider = {
    request: async (request) => {
      this.#pendingRequestsCount++;
      // TODO: handle batch requests
      try {
        const rpcRequest = {
          id: crypto.randomUUID(),
          jsonrpc: "2.0",
          method: request.method,
          params: request.params,
        };
        const response: any = (
          await this.#communicator.postRequestAndWaitForResponse({
            requestId: crypto.randomUUID(),
            data: rpcRequest,
          })
        )?.data;
        if ("error" in response) {
          throw new Error(JSON.stringify(response.error));
        }
        return response.result;
      } finally {
        this.#pendingRequestsCount--;

        const disconnectIfNoPendingRequests = () => {
          if (this.#pendingRequestsCount <= 0) {
            this.#communicator.disconnect();
          }
        };

        if (FINAL_METHODS.includes(request.method)) {
          disconnectIfNoPendingRequests();
        } else {
          setTimeout(disconnectIfNoPendingRequests, 1000);
        }
      }
    },
  };
}

export interface PopupConnectorOptions extends Eip6963ProviderInfo {
  /**
   * Called when user browser blocks a popup. Use this to attempt to re-open the popup.
   * Must call the provided callback right after user clicks a button, so browser does not block it.
   * Browsers usually don't block popups if they are opened within a few milliseconds of a button click.
   */
  fallbackOpenPopup?: FallbackOpenPopup;
  walletUrl: string;
}
