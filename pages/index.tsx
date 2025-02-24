import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Swap from '../components/swapComponent'
import { getServerSideProps } from '../helpers/getSettings'
import { SWRConfig } from 'swr'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { resolveRoutesURLForSelectedToken } from '../helpers/routes'
import PulsatingCircles from '../components/utils/pulse'

export default function Home({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey

  const sourceRoutesDeafultKey = resolveRoutesURLForSelectedToken({ direction: 'from', network: undefined, token: undefined, includes: { unmatched: true, unavailable: true } })
  const destinationRoutesDefaultKey = resolveRoutesURLForSelectedToken({ direction: 'to', network: undefined, token: undefined, includes: { unmatched: true, unavailable: true } })

  return (
    <SWRConfig value={{
      fallback: {
        [sourceRoutesDeafultKey]: { data: settings.sourceRoutes, error: null },
        [destinationRoutesDefaultKey]: { data: settings.destinationRoutes, error: null },
      }
    }}>
      <Layout settings={settings} themeData={themeData}>
        <PulsatingCircles />
        <Swap />
      </Layout>
    </SWRConfig>
  )
}

export { getServerSideProps };
