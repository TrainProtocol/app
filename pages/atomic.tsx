import LayerSwapApiClient from '../lib/layerSwapApiClient';
import Layout from '../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { TimerProvider } from '../context/timerContext';
import { getThemeData } from '../helpers/settingsHelper';
import AtmoicSteps from '../components/Swap/AtomicChat'
import { FeeProvider } from '../context/feeContext';

const AtomicPage = ({ settings, themeData, apiKey }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    LayerSwapApiClient.apiKey = apiKey

    return (<>
        <Layout settings={settings} themeData={themeData}>
            <TimerProvider>
                <FeeProvider>
                    <AtmoicSteps type='widget' />
                </FeeProvider>
            </TimerProvider>
        </Layout>
    </>)
}

export const getServerSideProps = async (ctx) => {
    const app = ctx.query?.appName || ctx.query?.addressSource
    const apiKey = JSON.parse(process.env.API_KEYS || "{}")?.[app] || process.env.NEXT_PUBLIC_API_KEY
    LayerSwapApiClient.apiKey = apiKey
    const apiClient = new LayerSwapApiClient()
    const { data: networkData } = await apiClient.GetLSNetworksAsync()

    if (!networkData) return

    const version = process.env.NEXT_PUBLIC_API_VERSION

    const settings = {
        networks: networkData.filter(n => version == 'sandbox' ? n.isTestnet : !n.isTestnet),
    }

    const themeData = await getThemeData(ctx.query)

    return {
        props: {
            settings,
            themeData,
            apiKey
        }
    }
}

export default AtomicPage