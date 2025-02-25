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
        <div className="relative w-full flex flex-col items-center">
          <div className="absolute top-[100%] left-0 w-full flex items-center justify-center pointer-events-none">
            <PulsatingCircles />
          </div>
          <Swap />
        </div>
      </Layout>
    </SWRConfig>
  )
}

export { getServerSideProps };
