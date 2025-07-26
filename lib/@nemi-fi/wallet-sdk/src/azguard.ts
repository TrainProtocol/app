import type { Eip6963ProviderDetail } from "./base";
import {
  AZTEC_EIP6963_ANNOUNCE_PROVIDER,
  AZTEC_EIP6963_REQUEST_PROVIDERS,
} from "./injected";
import { decodeContractInstance } from "./serde";
import type {
  RpcRequestMap,
  SerializedContractArtifact,
  SerializedContractInstance,
  TypedEip1193Provider,
} from "./types";
import { lazyValue, request } from "./utils";

/**
 * @deprecated nuke this and this whole file when azguard properly implements EIP-6963 & RPC spec
 */
export const startAzguardEip6963Announcing = lazyValue(async () => {
  if (typeof window === "undefined") {
    return;
  }

  const detail = lazyValue(async () => {
    const info = {
      uuid: "azguard",
      name: "Azguard",
      icon: "https://pbs.twimg.com/profile_images/1866922717104005120/fq8Fb48N_400x400.png",
    };
    const azguard = await AzguardClient.create();
    if (!azguard) {
      return;
    }
    const provider = new AzguardEip6963Provider(azguard);
    const detail: Eip6963ProviderDetail = {
      info,
      provider,
    };
    return detail;
  });

  window.addEventListener(AZTEC_EIP6963_REQUEST_PROVIDERS, async () => {
    const d = await detail();
    if (!d) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent(AZTEC_EIP6963_ANNOUNCE_PROVIDER, {
        detail: d,
      }),
    );
  });
});

/** Azguard Wallet provider compatible with Aztec RPC spec */
class AzguardEip6963Provider implements TypedEip1193Provider {
  readonly #azguard: AzguardClient;

  constructor(azguard: AzguardClient) {
    this.#azguard = azguard;
    this.#azguard.onAccountsChanged.addHandler(this.#accountsChanged);
    this.#azguard.onDisconnected.addHandler(this.#accountsChanged);
  }

  request: TypedEip1193Provider["request"] = (request) => {
    if (!(request.method in this.#methods)) {
      throw new Error(`Unsupported method: ${request.method}`);
    }
    return this.#methods[request.method](...request.params);
  };

  #methods: {
    [K in keyof RpcRequestMap]: (
      ...args: Parameters<RpcRequestMap[K]>
    ) => Promise<ReturnType<RpcRequestMap[K]>>;
  } = {
      aztec_requestAccounts: async () => {
        const dappMetadata = {
          name: window.location.host,
        };
        const requiredPermissions: unknown[] = [];
        const optionalPermissions: unknown[] = [
          {
            chains: [
              "aztec:11155111", // testnet
              "aztec:1337", // devnet
              "aztec:31337", // sandbox
            ],
            methods: [
              "register_contract",
              "register_token",
              "send_transaction",
              "simulate_views",
              "encoded_call",
              "add_capsule",
              "add_private_authwit",
            ],
          },
        ];
        await this.#azguard.connect(
          dappMetadata,
          requiredPermissions,
          optionalPermissions,
        );
        return this.#methods.aztec_accounts();
      },

      aztec_accounts: async () => {
        return this.#azguard.accounts.map((x: string) => x.split(":").at(-1)!);
      },

      aztec_sendTransaction: async (request) => {
        const account = this.#azguard.accounts.find((x: string) =>
          x.endsWith(request.from),
        );
        if (!account) {
          throw new Error("Unauthorized account");
        }
        const chain = account.substring(0, account.lastIndexOf(":"));

        type RegisterContractOperation = {
          kind: "register_contract";
          chain: string;
          address: string;
          instance: Awaited<ReturnType<typeof getInstance>>;
          artifact: Awaited<ReturnType<typeof getArtifact>>;
        };
        type SendTransactionOperation = {
          kind: "send_transaction";
          account: string;
          actions: any[];
        };
        type Operation = RegisterContractOperation | SendTransactionOperation | any; // Add other operation types as needed

        const operations: Operation[] = [];

        if (request.registerContracts) {
          for (const contract of request.registerContracts) {
            operations.push({
              kind: "register_contract",
              chain,
              address: contract.address,
              instance: await getInstance(contract.instance, contract.address),
              artifact: await getArtifact(contract.artifact),
            });
          }
        }

        type Action =
          | {
            kind: "add_capsule";
            capsule: string[];
            contract: string;
            storageSlot: string;
          }
          | {
            kind: "add_private_authwit";
            content: {
              kind: "encoded_call";
              caller: string;
              to: string;
              selector: string;
              args: any[];
            };
          }
          | {
            kind: "encoded_call";
            to: string;
            selector: string;
            args: any[];
          };

        const actions: Action[] = [];

        if (request.capsules) {
          actions.push(
            ...request.capsules.map((x) => ({
              kind: "add_capsule" as const,
              capsule: x.data,
              contract: x.contract,
              storageSlot: x.storageSlot,
            })),
          );
        }

        actions.push(
          ...request.authWitnesses.map((x) => ({
            kind: "add_private_authwit" as const,
            content: {
              kind: "encoded_call" as const,
              caller: x.caller,
              to: x.action.to,
              selector: x.action.selector,
              args: x.action.args,
            },
          })),
        );

        actions.push(
          ...request.calls.map((x) => ({
            kind: "encoded_call" as const,
            to: x.to,
            selector: x.selector,
            args: x.args,
          })),
        );

        operations.push({
          kind: "send_transaction",
          account,
          actions,
        });

        const results = (await this.#azguard.execute(operations)) as [any];
        if (results.at(-1).status !== "ok") {
          throw new Error(
            `Operation failed: ${results.find((x) => x.status === "failed").error}`,
          );
        }

        return results.at(-1).result;
      },

      aztec_call: async (request) => {
        const account = this.#azguard.accounts.find((x: string) =>
          x.endsWith(request.from),
        );
        if (!account) {
          throw new Error("Unauthorized account");
        }
        const chain = account.substring(0, account.lastIndexOf(":"));

        const operations: any[] = [];

        if (request.registerContracts) {
          for (const contract of request.registerContracts) {
            operations.push({
              kind: "register_contract",
              chain,
              address: contract.address,
              instance: await getInstance(contract.instance, contract.address),
              artifact: await getArtifact(contract.artifact),
            });
          }
        }

        operations.push({
          kind: "simulate_views",
          account,
          calls: request.calls.map((x) => ({
            kind: "encoded_call",
            to: x.to,
            selector: x.selector,
            args: x.args,
          })),
        });

        const results = (await this.#azguard.execute(operations)) as [any];
        if (results.at(-1).status !== "ok") {
          throw new Error(
            `Simulation failed: ${results.find((x) => x.status === "failed").error}`,
          );
        }

        return results.at(-1).result.encoded;
      },

      wallet_watchAssets: async (request) => {
        const results = (await this.#azguard.execute(
          request.assets.map((asset) => ({
            kind: "register_token",
            account: this.#azguard.accounts[0], // TODO: fix when chainId is added to the request
            address: asset.options.address,
          })),
        )) as [any];

        if (results.at(-1).status !== "ok") {
          throw new Error(
            `Adding assets failed: ${results.find((x) => x.status === "failed").error}`,
          );
        }
      },
    };

  #accountsChanged = async () => {
    // TODO: emit RpcEventsMap.accountsChanged(await this.#aztec_accounts())
  };
}

async function getInstance(
  instance: SerializedContractInstance | undefined,
  address: string,
) {
  if (!instance) {
    return undefined;
  }
  return { ...(await decodeContractInstance(instance)), address };
}

async function getArtifact(artifact: SerializedContractArtifact | undefined) {
  if (!artifact) {
    return undefined;
  }
  if (artifact.type === "url") {
    const literal = await request({ method: "GET", url: artifact.url });
    artifact = { type: "literal", literal };
  }
  return artifact.literal;
}

// Note: not depending on azguard npm package because this file will be nuked anyway

/** Simple client for interaction with the Azguard Wallet via inpage RPC */
class AzguardClient {
  /** Indicates whether the wallet is connected or not */
  public get connected(): boolean {
    return !!this.#session;
  }

  /** List of approved account addresses */
  public get accounts() {
    return this.#session?.accounts ?? [];
  }

  /** List of approved permissions */
  public get permissions() {
    return this.#session?.permissions ?? [];
  }

  /** Event handlers invoked when the wallet is connected */
  public get onConnected() {
    return this.#onConnected;
  }

  /** Event handlers invoked when the wallet is disconnected */
  public get onDisconnected() {
    return this.#onDisconnected;
  }

  /** Event handlers invoked when the wallet user changes approved accounts */
  public get onAccountsChanged() {
    return this.#onAccountsChanged;
  }

  /** Event handlers invoked when the wallet user changes approved permissions */
  public get onPermissionsChanged() {
    return this.#onPermissionsChanged;
  }

  readonly #scope: string;
  readonly #onConnected: EventHandlers<void> = new EventHandlers();
  readonly #onDisconnected: EventHandlers<void> = new EventHandlers();
  readonly #onAccountsChanged = new EventHandlers();
  readonly #onPermissionsChanged = new EventHandlers();

  #rpc?: any;
  #session?: any;

  private constructor(scope: string) {
    this.#scope = scope;
  }

  /**
   * Connects to the wallet
   * @param dappMetadata Dapp metadata
   * @param requiredPermissions List of required permissions the wallet user must approve
   * @param optionalPermissions List of optional permissions the wallet user may approve
   */
  public async connect(
    dappMetadata: unknown,
    requiredPermissions: unknown[],
    optionalPermissions?: unknown[],
  ): Promise<void> {
    if (!this.#rpc) {
      throw new Error("Azguard Wallet is not installed");
    }
    this.#session = await this.#rpc.request("connect", {
      dappMetadata,
      requiredPermissions,
      optionalPermissions,
    });
    localStorage.setItem(`azguard:session:${this.#scope}`, this.#session.id);
    this.#onConnected.dispatch();
  }

  /**
   * Disconnects from the wallet
   */
  public async disconnect(): Promise<void> {
    if (!this.#session) {
      return;
    }
    await this.#rpc!.request("close_session", this.#session.id);
  }

  /**
   * Executes a batch of operations.
   * If one of the operations fails, all the subsequent operations are skipped.
   * @param operations Batch of operations to execute
   * @returns Array of results corresponding to the array of operations
   */
  public async execute(operations: unknown[]) {
    if (!this.#rpc) {
      throw new Error("Azguard Wallet is not installed");
    }
    if (!this.#session) {
      throw new Error("Azguard Wallet is not connected");
    }
    return await this.#rpc.request("execute", {
      sessionId: this.#session.id,
      operations,
    });
  }

  /**
   * Requests information about the wallet
   * @returns Wallet info
   */
  public async getWalletInfo() {
    if (!this.#rpc) {
      throw new Error("Azguard Wallet is not installed");
    }
    return await this.#rpc.request("get_wallet_info");
  }

  readonly #onSessionUpdated = (session: any) => {
    const permissionsChanged =
      this.permissions.length !== session.permissions.length ||
      this.permissions.some(
        (p: any, i: number) =>
          (p.chains?.length ?? 0) !==
          (session.permissions[i].chains?.length ?? 0) ||
          p.chains?.some(
            (c: unknown, j: number) => c !== session.permissions[i].chains![j],
          ) ||
          (p.methods?.length ?? 0) !==
          (session.permissions[i].methods?.length ?? 0) ||
          p.methods?.some(
            (m: unknown, j: number) => m !== session.permissions[i].methods![j],
          ) ||
          (p.events?.length ?? 0) !==
          (session.permissions[i].events?.length ?? 0) ||
          p.events?.some(
            (e: unknown, j: number) => e !== session.permissions[i].events![j],
          ),
      );
    const accountsChanged =
      this.accounts.length !== session.accounts.length ||
      this.accounts.some((a: unknown, i: number) => a !== session.accounts[i]);
    this.#session = session;
    if (permissionsChanged) {
      this.#onPermissionsChanged.dispatch(this.permissions);
    }
    if (accountsChanged) {
      this.#onAccountsChanged.dispatch(this.accounts);
    }
  };

  readonly #onSessionClosed = () => {
    this.#onDisconnected.dispatch();
    this.#session = undefined;
    localStorage.removeItem(`azguard:session:${this.#scope}`);
  };

  async #init() {
    const windowAzguard = (await new Promise((resolve) => {
      let retries = 10;
      const interval = setInterval(() => {
        if ((window as any).azguard) {
          clearInterval(interval);
          resolve((window as any).azguard);
        } else if (--retries === 0) {
          clearInterval(interval);
          resolve(undefined);
        }
      }, 100);
    })) as any;
    if (!windowAzguard) {
      return undefined;
    }
    const client = windowAzguard.createClient();
    client.on("session_updated", this.#onSessionUpdated);
    client.on("session_closed", this.#onSessionClosed);
    if (!localStorage) return undefined
    const sessionId = localStorage.getItem(`azguard:session:${this.#scope}`);
    const session = sessionId
      ? ((await client.request("get_session", sessionId)) ?? undefined)
      : undefined;

    this.#rpc = client;
    this.#session = session;
    return this;
  }

  /**
   * Creates Azguard client
   * @param scope Session scope (you can create multiple clients with different scopes to have parallel sessions with the wallet)
   * @returns AzguardClient instance
   */
  public static create(scope?: string): Promise<AzguardClient | undefined> {
    return new AzguardClient(scope ?? "default").#init();
  }
}

class EventHandlers<T> {
  #handlers: Set<(payload: T) => void> = new Set();

  public addHandler(handler: (payload: T) => void) {
    this.#handlers.add(handler);
  }

  public removeHandler(handler: (payload: T) => void) {
    this.#handlers.delete(handler);
  }

  public dispatch(payload: T) {
    for (const handler of this.#handlers) {
      try {
        handler(payload);
      } catch { }
    }
  }
}
