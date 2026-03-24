import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import Swap from '../components/swapComponent'
import { getServerSideProps } from '../helpers/getSettings'

export default function Home({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) {

  return (
    <Layout settings={settings}>
      <Swap />
    </Layout>
  )
}

export { getServerSideProps };