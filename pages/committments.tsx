import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import CommitmentsHistory from '../components/Swap/CommitmentsHistory'
import { getServerSideProps } from '../helpers/getSettings'
import LayerSwapApiClient from '../lib/layerSwapApiClient'
import { AtomicProvider } from '../context/atomicContext'

export default function Transactions({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  LayerSwapApiClient.apiKey = apiKey
  return (
    <Layout settings={settings} themeData={themeData}>
      <AtomicProvider>
        <CommitmentsHistory />
      </AtomicProvider>
    </Layout>
  )
}

export { getServerSideProps };
