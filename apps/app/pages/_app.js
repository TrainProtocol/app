import '../styles/globals.css'
import '../styles/dialog-transition.css'
import '../styles/vaul.css'
import { useRouter } from "next/router";
import { IntercomProvider } from 'react-use-intercom';
import { SWRConfig } from 'swr'
import ProgressBar from "@badrap/bar-of-progress";
import Router from "next/router";
import { useEffect } from "react";
import { PostHogProvider } from 'posthog-js/react'
import posthog from 'posthog-js'
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from 'next-themes';
import { registerEvmSdk } from '@train-protocol/evm';
import { initFaro } from '../lib/faro';

if (typeof window !== 'undefined') {
  initFaro();
  registerEvmSdk();
  import('@train-protocol/aztec').then(m => m.registerAztecSdk());
  import('@train-protocol/solana').then(m => m.registerSolanaSdk());
  import('@train-protocol/starknet').then(m => m.registerStarknetSdk());
  import('@train-protocol/fuel').then(m => m.registerFuelSdk());
}

const progress = new ProgressBar({
  size: 2,
  color: "rgb(var(--ls-colors-primary))",
  className: "bar-of-progress",
  delay: 100,
});

Router.events.on("routeChangeStart", progress.start);
Router.events.on("routeChangeComplete", progress.finish);
Router.events.on("routeChangeError", progress.finish);

const INTERCOM_APP_ID = 'h5zisg78'
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// Check that PostHog is client-side (used to handle Next.js SSR)
if (typeof window !== 'undefined' && posthogKey) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: 'identified_only',
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') posthog.debug()
    }
  })
}

function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    // Track page views
    const handleRouteChange = () => posthog?.capture('$pageview')
    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [])

  return (
    <PostHogProvider client={posthog}>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          dedupingInterval: 5000,
        }}
      >
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="system"
          themes={["default", "light"]}
          storageKey="theme"
          disableTransitionOnChange
          enableSystem={true}
          value={{ light: "light", dark: "default" }}
        >
          <IntercomProvider appId={INTERCOM_APP_ID} initializeDelay={2500}>
            <Component key={router.asPath} {...pageProps} />
          </IntercomProvider>
        </ThemeProvider>
      </SWRConfig>
      <Analytics />
    </PostHogProvider>
  )
}

export default App