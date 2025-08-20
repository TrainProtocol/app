import { Bridge, type BridgeInterface, type KeyPair } from "@obsidion/bridge";
import { Bytes } from "ox";
import { joinURL } from "ufo";
import { persisted } from "svelte-persisted-store";
import { derived, type Readable, type Writable } from "svelte/store";
import type { IArtifactStrategy } from "./artifacts";
import type { Eip6963ProviderInfo, IConnector } from "./base";
import type { TypedEip1193Provider } from "./types";
import { METHODS_NOT_REQUIRING_CONFIRMATION } from "./utils";

export class ObsidionBridgeConnector implements IConnector {
  readonly info: Eip6963ProviderInfo;

  #pendingRequestsCount = 0;
  #popup: Window | null = null;
  #bridgeConnection: BridgeInterface | null = null;
  #connectionLock = false;
  #connectionInitPromise: Promise<BridgeInterface> | null = null;
  #messageHandlerInitialized = false;
  #registerRequest: (
    id: string,
    method: string,
    resolve: any,
    reject: any,
    timeout?: number,
  ) => void = () => {};

  // Use persisted stores for connection state
  readonly #connectedAccountAddress: Writable<string | null>;
  readonly accountObservable: Readable<string | undefined>;
  readonly artifactStrategy: IArtifactStrategy;
  readonly walletUrl: string;
  readonly #fallbackOpenPopup?: FallbackOpenPopup;

  private static readonly BRIDGE_SESSION_STORAGE_KEY =
    "obsidion-bridge-session";
  private static readonly SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor(params: ObsidionBridgeConnectorOptions) {
    this.info = { uuid: params.uuid, name: params.name, icon: params.icon };
    this.walletUrl = joinURL(params.walletUrl, "/sign");
    this.artifactStrategy = params.artifactStrategy;
    this.#fallbackOpenPopup = params.fallbackOpenPopup;

    // Initialize the persisted stores
    this.#connectedAccountAddress = persisted<string | null>(
      `aztec-wallet-connected-address-${params.uuid}`,
      null,
    );

    this.accountObservable = derived(
      this.#connectedAccountAddress,
      (x) => x ?? undefined,
    );

    // to enforce auto-expiry
    const state = this.restoreBridgeSession();
    if (!state) {
      let currentAddress: string | null = null;
      const unsubscribe = this.#connectedAccountAddress.subscribe((value) => {
        currentAddress = value;
      });
      unsubscribe();

      if (currentAddress) {
        this.clearBridgeSession();
        this.#connectedAccountAddress.set(null);
      }
    }
  }

  /**
   * Get or create a bridge connection, with proper synchronization
   */
  async #getOrCreateConnection(): Promise<BridgeInterface> {
    // If there's an in-flight connection creation, return that promise
    if (this.#connectionInitPromise) {
      return this.#connectionInitPromise;
    }

    // Wait for any lock to be released - implement a simple spinlock
    while (this.#connectionLock) {
      await new Promise((resolve) => setTimeout(resolve, 10)); // Short wait
    }

    // Set the lock to prevent concurrent initialization
    this.#connectionLock = true;

    try {
      if (this.#bridgeConnection) {
        return this.#bridgeConnection;
      }

      if (this.#connectionInitPromise) {
        return this.#connectionInitPromise;
      }

      // Start a new connection creation process
      const connectionState = this.restoreBridgeSession();

      // Create and store the promise before any async operations
      this.#connectionInitPromise = (async () => {
        try {
          const resume = !!connectionState;

          const bridgeConnection = await Bridge.create({
            keyPair: connectionState?.keyPair,
            remotePublicKey: connectionState?.remotePublicKey,
            resume,
          });

          if (resume) {
            await this.waitForSecureChannel(bridgeConnection);
          }

          // Cache the result
          this.#bridgeConnection = bridgeConnection;

          return bridgeConnection;
        } catch (error) {
          console.error("Error creating bridge connection:", error);
          // Clear the bridge connection on error
          this.#bridgeConnection = null;
          throw error;
        } finally {
          // Clear the promise after it completes (success or error)
          this.#connectionInitPromise = null;
        }
      })();

      return this.#connectionInitPromise;
    } finally {
      // Always release the lock
      this.#connectionLock = false;
    }
  }

  async connect() {
    try {
      const result = await this.provider.request({
        method: "aztec_requestAccounts",
        params: [],
      });

      const [address] = result;

      if (address) {
        this.#connectedAccountAddress.set(address);
        return address;
      }
      return undefined;
    } catch (error) {
      console.error("Failed to connect:", error);

      this.#popup = null;
      this.#pendingRequestsCount = 0;
      this.#messageHandlerInitialized = false;
      this.#registerRequest = () => {};

      this.#connectionInitPromise = null;
      this.#connectedAccountAddress.set(null);
      this.clearBridgeSession();

      // Close and clear the bridge connection
      try {
        this.#bridgeConnection?.close();
      } catch (error) {
        console.error("Failed to close bridge connection:", error);
      }
      this.#bridgeConnection = null;

      return undefined;
    }
  }

  async reconnect() {
    console.log("Reconnect not supported in ObsidionBridgeConnector");
    return undefined;
  }

  async disconnect() {
    try {
      await this.closeBridge(
        this.#bridgeConnection ?? (await this.#getOrCreateConnection()),
      );

      // Clear message handler initialization state
      this.#messageHandlerInitialized = false;

      // Reset the request registration function to no-op
      this.#registerRequest = () => {};

      // Clear connection references
      this.#connectionInitPromise = null;

      // Clear popup
      this.#popup = null;

      // Clear account information
      this.#connectedAccountAddress.set(null);
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      // Ensure these are cleared even if there was an error
      this.#bridgeConnection = null;
      this.#connectionInitPromise = null;
      this.#messageHandlerInitialized = false;
    }
  }

  // TODO: what if this DISCONNECT message is sent but not received?
  // This happens when the wallet's main tab is not open when this method is called.
  private async closeBridge(bridgeConnection: BridgeInterface) {
    try {
      // Send DISCONNECT message to the wallet
      await bridgeConnection.sendMessage("DISCONNECT", undefined);
      bridgeConnection.close();

      // Remove persisted connection state
      this.clearBridgeSession();
      this.#bridgeConnection = null;
    } catch (error) {
      console.error("Failed to close bridge connection:", error);
    }
  }

  provider: TypedEip1193Provider = {
    request: async (request) => {
      const abortController = new AbortController();

      if (this.#pendingRequestsCount > 20) {
        throw new Error("can't send request while pending requests count > 20");
      }

      const bridgeConnection = await this.#getOrCreateConnection();

      const rpcRequest = {
        id: crypto.randomUUID(),
        jsonrpc: "2.0",
        method: request.method,
        params: request.params || [],
      };

      this.#pendingRequestsCount++;

      this.#setupMessageRouter(bridgeConnection);

      if (METHODS_NOT_REQUIRING_CONFIRMATION.includes(request.method)) {
        try {
          return await this.#sendRequest(bridgeConnection, rpcRequest);
        } finally {
          abortController.abort();
        }
      } else {
        return await this.#sendRequestPopup(bridgeConnection, rpcRequest);
      }
    },
  };

  async #sendRequestPopup(
    bridgeConnection: BridgeInterface,
    request: any,
  ): Promise<any> {
    const isRequestAccount = request.method === "aztec_requestAccounts";
    try {
      // Open the popup with the bridge URL and topic in the query parameters
      this.#openPopupWithBridgeUrl(
        bridgeConnection.connectionString,
        isRequestAccount,
      );

      if (!this.#popup) {
        throw new Error(
          "Failed to open popup. It may have been blocked by the browser.",
        );
      }

      if (isRequestAccount && !bridgeConnection.isSecureChannelEstablished()) {
        await this.waitForSecureChannel(bridgeConnection);
      } else {
        await this.waitForPopupReady(bridgeConnection);
      }

      // Wait for the response promise to resolve and return its value
      return await this.#createResponsePromise(
        bridgeConnection,
        request,
        200000,
      );
    } catch (error) {
      console.error("Failed to send popup request:", error);
      throw error;
    } finally {
      this.#pendingRequestsCount--;
      this.#popup = null;
    }
  }

  async #sendRequest(
    bridgeConnection: BridgeInterface,
    request: any,
  ): Promise<any> {
    try {
      // Send the request
      return await this.#createResponsePromise(
        bridgeConnection,
        request,
        60000,
      );
    } finally {
      this.#pendingRequestsCount--;
    }
  }

  private async waitForSecureChannel(
    bridgeConnection: BridgeInterface,
  ): Promise<void> {
    // Wait for the secure channel to be established first
    await new Promise<void>((resolve) => {
      bridgeConnection.onSecureChannelEstablished(() => {
        this.saveBridgeSession(
          bridgeConnection.getKeyPair(),
          Bytes.fromHex(`0x${bridgeConnection.getRemotePublicKey()}`),
        );
        // Only add a minimal delay (10ms) for state propagation
        setTimeout(resolve, 10);
      });
    });
  }

  private async waitForPopupReady(
    bridgeConnection: BridgeInterface,
  ): Promise<void> {
    await new Promise<void>((resolve) => {
      let isResolved = false;
      let readyCheckInterval: ReturnType<typeof setInterval> | null = null;

      const messageHandler = (message: any) => {
        if (isResolved) return; // Ignore subsequent calls

        if (message && message.method === "popup_ready") {
          if (readyCheckInterval) clearInterval(readyCheckInterval);
          isResolved = true;
          resolve();
        } else if (
          message &&
          message.method === "rpc_response" &&
          message.params?.result?.error
        ) {
          if (readyCheckInterval) clearInterval(readyCheckInterval);
          isResolved = true;
          resolve();
        }
      };

      // Register the message listener
      bridgeConnection.onSecureMessage(messageHandler);

      const maxWaitTime = 10000; // 10 seconds
      const startTime = Date.now();
      readyCheckInterval = setInterval(() => {
        if (Date.now() - startTime > maxWaitTime) {
          clearInterval(readyCheckInterval!);
          console.warn(
            "Timed out waiting for ready message, proceeding anyway",
          );
          isResolved = true;
          resolve();
        }
      }, 100);
    });
  }

  async #createResponsePromise(
    bridgeConnection: BridgeInterface,
    rpcRequest: any,
    timeoutMs: number = 200000,
  ): Promise<any> {
    const requestId = `${bridgeConnection.getPublicKey()}-${rpcRequest.id}`;
    try {
      await bridgeConnection.sendMessage("WALLET_RPC", rpcRequest);
    } catch (error) {
      console.error("Failed to send request:", error);
    }

    return new Promise((resolve, reject) => {
      // Register this request with the message router
      this.#registerRequest(
        requestId,
        rpcRequest.method,
        resolve,
        reject,
        timeoutMs,
      );
    });
  }

  #setupMessageRouter(bridgeConnection: BridgeInterface) {
    // Skip setup if already initialized
    if (this.#messageHandlerInitialized) return;

    // Store all pending request handlers
    const pendingRequests = new Map<
      string,
      {
        resolve: (value: any) => void;
        reject: (reason: any) => void;
        method: string;
        timeout: any;
      }
    >();

    // Track outgoing request IDs to filter out echoed messages
    const outgoingRequestIds = new Set<string>();

    // Create a single message handler for all requests
    const messageHandler = (message: any) => {
      try {
        // Check if this is an outgoing request echo
        if (message && message.method === "WALLET_RPC") {
          // Extract the ID from the outgoing request
          let requestId = null;
          if (message.params && message.params.id) {
            requestId = message.params.id;
          }

          // Add to tracking set if it's a new outgoing request
          if (requestId) {
            outgoingRequestIds.add(requestId);
            return; // Skip further processing
          }
        }

        // Handle actual responses
        if (message && message.method === "rpc_response") {
          // Extract ID from response
          let requestId: string | undefined;
          if (message.params && message.params.id) {
            requestId = message.params.id;
          } else if (message.id) {
            requestId = message.id;
          } else if (
            message.params &&
            message.params.result &&
            message.params.result.id
          ) {
            requestId = message.params.result.id;
          }

          // Find matching pending request
          if (requestId && pendingRequests.has(requestId)) {
            const { resolve, reject, timeout, method } =
              pendingRequests.get(requestId)!;

            // Clear timeout
            clearTimeout(timeout);

            const result = message.params.result;

            // Check for errors
            if (result && result.error) {
              console.error(
                `ROUTER: Error in response for ${method}:`,
                result.error,
              );
              reject(new Error(result.error.message || "Unknown error"));
            } else {
              resolve(result);
            }

            // Remove the handler after processing
            pendingRequests.delete(requestId);
            outgoingRequestIds.delete(requestId); // Clean up tracking
          }
        }
      } catch (e) {
        console.error("ROUTER: Error processing message:", e);
      }
    };

    // Set the message handler on the bridge connection
    if (bridgeConnection) {
      bridgeConnection.onSecureMessage(messageHandler);
      this.#messageHandlerInitialized = true;
    }

    // Expose the request registration method
    this.#registerRequest = (
      id: string,
      method: string,
      resolve: any,
      reject: any,
      timeoutMs: number = 200000,
    ) => {
      const timeout = setTimeout(() => {
        const timeoutSeconds = timeoutMs / 1000;
        console.error(
          `Request "${method}" (${id}) timed out after ${timeoutSeconds} seconds`,
        );
        if (pendingRequests.has(id)) {
          pendingRequests
            .get(id)!
            .reject(
              new Error(
                `Request "${method}" timed out after ${timeoutSeconds} seconds`,
              ),
            );
          pendingRequests.delete(id);
          outgoingRequestIds.delete(id); // Clean up tracking
        }
      }, timeoutMs);

      pendingRequests.set(id, { resolve, reject, method, timeout });
    };
  }

  #openPopupWithBridgeUrl(connectionString: string, isRequestAccount: boolean) {
    const popupUrl = new URL(this.walletUrl);
    popupUrl.searchParams.set("uri", connectionString);
    popupUrl.searchParams.set("is_connect", isRequestAccount.toString());

    // Create a wallet URL with the bridge parameters
    const left = (window.innerWidth - POPUP_WIDTH) / 2 + window.screenX;
    const top = (window.innerHeight - POPUP_HEIGHT) / 2 + window.screenY;

    const openPopupFunc = () => {
      return window.open(
        popupUrl.toString(),
        "aztec-wallet-popup",
        `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`,
      );
    };

    // Try opening the popup directly
    this.#popup = openPopupFunc();
    this.#popup?.focus();

    // If popup was blocked and we have a fallback method, use it
    if (!this.#popup && this.#fallbackOpenPopup) {
      this.#fallbackOpenPopup(openPopupFunc)
        .then((popup) => {
          this.#popup = popup;
        })
        .catch((error) => {
          console.error("Error opening popup with fallback:", error);
        });
    }
  }

  /**
   * Save bridge session to local storage
   */
  private saveBridgeSession(
    keyPair: KeyPair,
    remotePublicKey?: Uint8Array,
  ): void {
    try {
      if (typeof window === "undefined") return undefined;
      localStorage.setItem(
        ObsidionBridgeConnector.BRIDGE_SESSION_STORAGE_KEY,
        JSON.stringify({
          publicKey: Bytes.toHex(keyPair.publicKey),
          privateKey: Bytes.toHex(keyPair.privateKey),
          ...(remotePublicKey
            ? {
                remotePublicKey: Bytes.toHex(remotePublicKey),
              }
            : {}),
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error("Failed to save bridge session to local storage:", error);
    }
  }

  /**
   * Restore bridge session from local storage
   */
  private restoreBridgeSession():
    | {
        keyPair: KeyPair;
        remotePublicKey?: Uint8Array;
      }
    | undefined {
    try {
      if (typeof window === "undefined") return undefined;
      const keyPairJson = localStorage.getItem(
        ObsidionBridgeConnector.BRIDGE_SESSION_STORAGE_KEY,
      );
      if (keyPairJson) {
        const parsedSavedKeyPair = JSON.parse(keyPairJson);

        // Check if session has expired
        const timestamp = parsedSavedKeyPair.timestamp;
        if (
          !timestamp ||
          Date.now() - timestamp > ObsidionBridgeConnector.SESSION_EXPIRY_MS
        ) {
          // Use closeBridge to properly clean up the session
          this.clearBridgeSession();
          return undefined;
        }

        // Convert hex strings back to Uint8Array
        const keyPair = {
          publicKey: Bytes.fromHex(parsedSavedKeyPair.publicKey),
          privateKey: Bytes.fromHex(parsedSavedKeyPair.privateKey),
        };
        return {
          keyPair,
          ...(parsedSavedKeyPair.remotePublicKey
            ? {
                remotePublicKey: Bytes.fromHex(
                  parsedSavedKeyPair.remotePublicKey,
                ),
              }
            : {}),
        };
      }
    } catch (error) {
      console.error(
        "Failed to retrieve bridge session from local storage:",
        error,
      );
    }
    return;
  }

  /**
   * Clear bridge session from local storage
   */
  private clearBridgeSession(): void {
    localStorage.removeItem(ObsidionBridgeConnector.BRIDGE_SESSION_STORAGE_KEY);
  }
}

export interface ObsidionBridgeConnectorOptions {
  /** EIP-6963 provider UUID */
  readonly uuid: string;
  /** Human readable wallet name */
  readonly name: string;
  /** Icon URL or data URL for the wallet */
  readonly icon: string;
  /** Wallet URL */
  readonly walletUrl: string;
  /** Artifact strategy */
  readonly artifactStrategy: IArtifactStrategy;
  /** Fallback open popup function */
  fallbackOpenPopup?: FallbackOpenPopup;
}

export type FallbackOpenPopup = (
  openPopup: () => Window | null,
) => Promise<Window | null>;

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 540;
