import Layout from '../components/layout'
import { InferGetServerSidePropsType } from 'next'
import CommitmentsHistory from '../components/Swap/CommitmentsHistory'
import { getServerSideProps } from '../helpers/getSettings'
import { AtomicProvider } from '../context/atomicContext'

export default function Transactions({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <Layout settings={settings} themeData={themeData}>
      <AtomicProvider>
        <CommitmentsHistory />
      </AtomicProvider>
    </Layout>
  )
}

export { getServerSideProps };
