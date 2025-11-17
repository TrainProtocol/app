import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Swap from '../components/swapComponent'
import { getServerSideProps } from '../helpers/getSettings'
import { SWRConfig } from 'swr'

export default function Home({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <SWRConfig value={{
      fallback: {
        ['/routes']: { data: settings.routes, error: null },
      }
    }}>
      <Layout settings={settings} themeData={themeData}>
        <Swap />
      </Layout>
    </SWRConfig>
  ) 
}

export { getServerSideProps };