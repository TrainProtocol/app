import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@train-protocol/sdk",
    "@train-protocol/evm",
    "@train-protocol/react",
  ],
};

export default nextConfig;
