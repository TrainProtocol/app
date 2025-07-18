import Layout from '../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React from 'react';
import { TimerProvider } from '../context/timerContext';
import AtmoicSteps from '../components/Swap/AtomicChat'
import { FeeProvider } from '../context/feeContext';
import { getServerSideProps } from '../helpers/getSettings';

const AtomicPage = ({ settings, themeData }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
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

export { getServerSideProps };

export default AtomicPage