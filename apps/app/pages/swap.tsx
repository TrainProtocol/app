import Layout from '../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { TimerProvider } from '../context/timerContext';
import AtmoicSteps from '../components/Swap/AtomicChat'
import { getServerSideProps } from '../helpers/getSettings';

const AtomicPage = ({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    return (<>
        <Layout settings={settings}>
            <TimerProvider>
                <AtmoicSteps type='widget' />
            </TimerProvider>
        </Layout>
    </>)
}

export { getServerSideProps };

export default AtomicPage