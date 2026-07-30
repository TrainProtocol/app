import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // TypeScript 7 (the native port) doesn't expose the programmatic compiler
    // API Next uses for its build-time type check, so run the tsc CLI instead.
    useTypeScriptCli: true,
  },
  transpilePackages: [
    "@train-protocol/sdk",
    "@train-protocol/evm",
    "@train-protocol/react",
  ],
};

export default nextConfig;
