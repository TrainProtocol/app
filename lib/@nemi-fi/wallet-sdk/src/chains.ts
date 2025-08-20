export interface AvmChain {
  id: number;
  name: string;
  rpcUrls: {
    default: AvmChainRpcUrls;
    [key: string]: AvmChainRpcUrls;
  };
}

export interface AvmChainRpcUrls {
  http: readonly [string, ...string[]];
}

export const chains = {
  testnet: {
    id: 418719321, // keccak256('aztec-testnet')[0:4]
    name: "Aztec Testnet",
    rpcUrls: {
      default: {
        http: ["https://full-node.alpha-testnet.aztec.network"],
      },
    },
  },

  sandbox: {
    id: 147120760, // keccak256('aztec-sandbox')[0:4]
    name: "Aztec Sandbox",
    rpcUrls: {
      default: {
        http: ["http://localhost:8080"],
      },
    },
  },
} as const satisfies Record<string, AvmChain>;
