import Layout from '../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Formik } from 'formik';
import { TimerProvider } from '../context/timerContext';
import AtmoicSteps from '../components/Swap/AtomicChat'
import { getServerSideProps } from '../helpers/getSettings';
import { useQueryState } from '../context/query';
import { generateSwapInitialValues } from '../lib/generateSwapInitialValues';
import { useSettingsState } from '../context/settings';
import { useSwapStore } from '../stores/swapStore';
import { useSwapProgress } from '@train-protocol/react';
import type { SwapFormValues } from '../components/DTOs/SwapFormValues';

const AtomicPage = ({ settings }: InferGetServerSidePropsType<typeof getServerSideProps>) => {
    return (<>
        <Layout settings={settings}>
            <SwapPageContent />
        </Layout>
    </>)
}

/** Inner component — renders inside Layout so TrainProvider context is available */
function SwapPageContent() {
    const router = useRouter()
    const query = useQueryState()
    const settingsState = useSettingsState()
    const initialValues: SwapFormValues = generateSwapInitialValues(settingsState, query ?? {})
    const activeHashlock = useSwapStore(s => s.activeHashlock)
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)

    // Restore hashlock from URL on mount (same pattern as Atomic/index.tsx)
    useEffect(() => {
        const hashlockFromUrl = router.query.hashlock as string | undefined
        if (hashlockFromUrl && !activeHashlock) {
            setActiveHashlock(hashlockFromUrl)
        }
    }, [router.query.hashlock])

    // Subscribe to the swap lifecycle — hydrates config from persisted data and starts polling
    useSwapProgress(activeHashlock)

    return (
        <TimerProvider>
            <Formik
                initialValues={initialValues}
                onSubmit={() => {}}
            >
                <AtmoicSteps type='widget' />
            </Formik>
        </TimerProvider>
    )
}

export { getServerSideProps };

export default AtomicPage
