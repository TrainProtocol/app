/**
 * Supported network kinds for the Helios light client.
 *
 * @remarks
 * - `ethereum` - Standard Ethereum networks (mainnet, testnets)
 * - `opstack` - Optimism Stack based L2 networks
 * - `linea` - Linea L2 network
 */
export type NetworkKind = "ethereum" | "opstack" | "linea";
/**
 * Creates a new HeliosProvider instance.
 *
 * @param config - Configuration object for the provider
 * @param kind - The type of network to connect to
 * @returns A promise that resolves to an initialized HeliosProvider instance
 *
 * @remarks
 * This function creates an EIP-1193 compliant Ethereum provider that can be used
 * with popular web3 libraries like viem, ethers.js or web3.js. Treat this the same as
 * you would `window.ethereum` when constructing a provider.
 *
 * @example
 * ```typescript
 * const provider = await createHeliosProvider({
 *   executionRpc: "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
 *   consensusRpc: "https://www.lightclientdata.org",
 *   network: "mainnet"
 * }, "ethereum");
 * ```
 */
export declare function createHeliosProvider(config: Config, kind: NetworkKind): Promise<HeliosProvider>;
/**
 * An EIP-1193 compliant Ethereum provider powered by the Helios light client.
 *
 * @remarks
 * HeliosProvider implements the Ethereum Provider API (EIP-1193) and can be used
 * as a drop-in replacement for `window.ethereum` in web3 applications. It provides
 * trustless access to Ethereum without relying on centralized RPC providers.
 *
 * The provider supports all standard Ethereum JSON-RPC methods and maintains
 * compatibility with popular libraries like viem, ethers.js, and web3.js.
 *
 * @example
 * ```typescript
 * // Using with viem
 * import { createPublicClient, custom } from 'viem';
 * import { mainnet } from 'viem/chains';
 *
 * const heliosProvider = await createHeliosProvider(config, "ethereum");
 * const client = createPublicClient({
 *   chain: mainnet,
 *   transport: custom(heliosProvider)
 * });
 *
 * // Using with ethers.js
 * import { BrowserProvider } from 'ethers';
 *
 * const heliosProvider = await createHeliosProvider(config, "ethereum");
 * const ethersProvider = new BrowserProvider(heliosProvider);
 * ```
 */
export declare class HeliosProvider {
    #private;
    private constructor();
    /** @internal */
    static createInternal(config: Config, kind: NetworkKind): HeliosProvider;
    /**
     * Waits for the light client to sync with the network.
     *
     * @returns A promise that resolves when the client is fully synced
     *
     * @remarks
     * This method blocks until the light client has synchronized with the network
     * and is ready to process requests. It's recommended to call this before
     * making any RPC requests to ensure accurate data.
     *
     * @example
     * ```typescript
     * const provider = await createHeliosProvider(config, "ethereum");
     * await provider.waitSynced();
     * console.log("Provider is ready!");
     * ```
     */
    waitSynced(): Promise<void>;
    /**
     * Sends an RPC request to the provider.
     *
     * @param req - The RPC request object containing method and params
     * @returns A promise that resolves with the RPC response
     * @throws {Error} If the RPC method is not supported or the request fails
     *
     * @remarks
     * This is the main entry point for all Ethereum JSON-RPC requests. It implements
     * the EIP-1193 provider interface and supports all standard Ethereum RPC methods.
     *
     * @example
     * ```typescript
     * // Get the latest block number
     * const blockNumber = await provider.request({
     *   method: "eth_blockNumber",
     *   params: []
     * });
     *
     * // Get account balance
     * const balance = await provider.request({
     *   method: "eth_getBalance",
     *   params: [address, "latest"]
     * });
     * ```
     */
    request(req: Request): Promise<any>;
    /**
     * Registers an event listener for provider events.
     *
     * @param eventName - The name of the event to listen for
     * @param handler - The callback function to handle the event
     *
     * @remarks
     * Supports standard EIP-1193 provider events including:
     * - `message` - For subscription updates
     * - `connect` - When the provider connects
     * - `disconnect` - When the provider disconnects
     * - `chainChanged` - When the chain ID changes
     * - `accountsChanged` - When accounts change (if applicable)
     *
     * @example
     * ```typescript
     * provider.on("message", (message) => {
     *   console.log("Received message:", message);
     * });
     *
     * // Subscribe to new blocks
     * const subId = await provider.request({
     *   method: "eth_subscribe",
     *   params: ["newHeads"]
     * });
     * ```
     */
    on(eventName: string, handler: (data: any) => void): void;
    /**
     * Removes an event listener from the provider.
     *
     * @param eventName - The name of the event to stop listening for
     * @param handler - The callback function to remove
     *
     * @remarks
     * Removes a previously registered event listener. The handler must be
     * the same function reference that was passed to `on()`.
     *
     * @example
     * ```typescript
     * const handler = (data) => console.log(data);
     *
     * // Add listener
     * provider.on("message", handler);
     *
     * // Remove listener
     * provider.removeListener("message", handler);
     * ```
     */
    removeListener(eventName: string, handler: (data: any) => void): void;
}
/**
 * Configuration options for creating a Helios provider.
 *
 * @remarks
 * Different network kinds require different configuration options:
 * - For Ethereum networks: executionRpc, consensusRpc, and optionally checkpoint are required
 * - For OpStack networks: executionRpc and verifiableApi are required
 * - For Linea networks: executionRpc is required
 */
export type Config = {
    /**
     * The RPC endpoint for execution layer requests.
     * This is required for all network types.
     * @example "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
     */
    executionRpc?: string;
    /**
     * The verifiable API endpoint for any networks.
     * Not recommended for use currently.
     * @example "https://verifiable-api-ethereum.operationsolarstorm.org
     */
    verifiableApi?: string;
    /**
     * The consensus layer RPC endpoint for Ethereum and OP Stack networks.
     * Required for Ethereum and OP Stack networks to sync.
     * @example "https://www.lightclientdata.org"
     */
    consensusRpc?: string;
    /**
     * A trusted checkpoint for faster initial sync on Ethereum networks.
     * Optional but recommended for better performance.
     * @example "0x1234567890abcdef..."
     */
    checkpoint?: string;
    /**
     * The network to connect to.
     * Defaults to Network.MAINNET for Ethereum networks.
     */
    network?: Network;
    /**
     * Where to cache checkpoints for persistence.
     * @defaultValue "localstorage"
     * @remarks
     * - `localstorage` - Store in browser's localStorage (web environments)
     * - `config` - Store in configuration (node environments)
     */
    dbType?: "localstorage" | "config";
};
/**
 * Supported networks across all network kinds for the Helios provider.
 *
 * @remarks
 * Networks are organized by their network kind:
 * - Ethereum networks: "mainnet", "sepolia", "holesky", "hoodi"
 * - OP Stack networks: "op-mainnet", "base", "worldchain", "zora", "unichain"
 * - Linea networks: "linea", "linea-sepolia"
 *
 * @example
 * ```typescript
 * // For Ethereum mainnet
 * const config: Config = {
 *   executionRpc: "https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY",
 *   consensusRpc: "https://www.lightclientdata.org",
 *   network: "mainnet"
 * };
 *
 * // For Optimism
 * const config: Config = {
 *   executionRpc: "https://mainnet.optimism.io",
 *   consensusRpc: "https://op-mainnet.operationsolarstorm.org",
 *   network: "op-mainnet"
 * };
 * ```
 */
export type Network = "mainnet" | "goerli" | "sepolia" | "holesky" | "hoodi" | "op-mainnet" | "base" | "worldchain" | "zora" | "unichain" | "linea" | "linea-sepolia";
type Request = {
    method: string;
    params: any[];
};
export {};
