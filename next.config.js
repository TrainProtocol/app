const { PHASE_PRODUCTION_SERVER } = require('next/constants');

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'Content-Security-Policy',
    value: 'frame-ancestors *.immutable.com'
  },
]

module.exports = (phase, { defaultConfig }) => {
  /**
   * @type {import('next').NextConfig}
   */
  const nextConfig = {
    experimental: {
      esmExternals: 'loose',
      serverComponentsExternalPackages: ['@aztec/aztec.js', '@solana/web3.js', 'viem', 'starknet'],
    },
    i18n: {
      locales: ["en"],
      defaultLocale: "en",
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'stagelslayerswapbridgesa.blob.core.windows.net',
        },
        {
          protocol: 'https',
          hostname: 'bransferstorage.blob.core.windows.net',
        },
        {
          protocol: 'https',
          hostname: 'devlslayerswapbridgesa.blob.core.windows.net',
        },
        {
          protocol: 'https',
          hostname: 'prodlslayerswapbridgesa.blob.core.windows.net',
        },
        {
          protocol: 'https',
          hostname: 'raw.githubusercontent.com',
        },
      ]
    },
    compiler: {
      removeConsole: false,
    },
    reactStrictMode: false,
    webpack: config => {
      config.resolve.fallback = { fs: false, net: false, tls: false };
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'javascript/auto',
        use: 'file-loader',
      });
      
      // Externalize heavy packages to reduce file handles
      config.externals = {
        ...config.externals,
        '@noble/hashes': '@noble/hashes',
        '@noble/curves': '@noble/curves',
        '@noble/secp256k1': '@noble/secp256k1',
      };
      
      // Reduce concurrent module resolution
      config.resolve.concurrency = 10;
      
      return config;
    },
    productionBrowserSourceMaps: true,
    transpilePackages: ['@imtbl/sdk', '@fuels/connectors', '@fuels/react', "@radix-ui/react-dismissable-layer"],
  }
  if (process.env.APP_BASE_PATH) {
    nextConfig.basePath = process.env.APP_BASE_PATH
  }
  if (phase === PHASE_PRODUCTION_SERVER) {
    nextConfig.headers = async () => {
      return [
        {
          // Apply these headers to all routes in your application.
          source: '/:path*',
          headers: securityHeaders,
        },
      ]
    }
  }

  return nextConfig;
}