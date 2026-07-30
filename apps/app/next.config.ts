import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@aztec/wallet-sdk", "@train-protocol/sdk", "@train-protocol/aztec", "@train-protocol/evm", "@train-protocol/starknet"],
  productionBrowserSourceMaps: true,
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
    // TypeScript 7 (the native port) doesn't expose the programmatic compiler
    // API Next uses for its build-time type check, so run the tsc CLI instead.
    useTypeScriptCli: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
      },
      {
        protocol: 'https',
        hostname: 'prodlslayerswapbridgesa.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: 'tempo.xyz',
      }
    ]
  },
  async rewrites() {
    return [
      {
        source: '/proxy/beaconchain-sepolia/:path*',
        destination: 'https://sync-sepolia.beaconcha.in/:path*',
      },
      {
        source: '/proxy/beaconchain-mainnet/:path*',
        destination: 'https://sync-mainnet.beaconcha.in/:path*',
      },
      {
        source: '/proxy/nimbus-sepolia/:path*',
        destination: 'https://ethereum-sepolia-beacon-api.publicnode.com/:path*',
      },
      {
        source: '/proxy/nimbus-mainnet/:path*',
        destination: 'https://unstable.mainnet.beacon-api.nimbus.team/:path*',
      },
    ]
  },
  // Required for @aztec/bb.js WASM (Barretenberg) — needs SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
    ]
  },
  // Turbopack is the default bundler as of Next 16 and supports WASM natively,
  // so no equivalent of the old webpack `asyncWebAssembly` experiment is needed.
  turbopack: {
    resolveAlias: {
      // Next's compiled Buffer is v5 and lacks the BigInt APIs Aztec 5 uses.
      "next/dist/compiled/buffer": {
        browser: "buffer/index.js",
      },
    },
  },
  webpack(config, { isServer }) {
    // Enable WASM support for @aztec/bb.js in the browser.
    // Only applies when building with `--webpack`; Turbopack ignores this.
    if (!isServer) {
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      }
    }
    return config
  },
};

export default nextConfig;
