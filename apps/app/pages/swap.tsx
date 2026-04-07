import Layout from '../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Formik } from 'formik';
import { TimerProvider } from '../context/timerContext';
import AtmoicSteps from '../components/Swap/AtomicChat'
import { Widget } from '../components/Widget/Index'
import { Loader2 } from 'lucide-react'
import { getServerSideProps } from '../helpers/getSettings';
import { useQueryState } from '../context/query';
import { generateSwapInitialValues } from '../lib/generateSwapInitialValues';
import { useSettingsState } from '../context/settings';
import { useSwapStore } from '../stores/swapStore';
import { useSwapProgress, useRecoverSwap } from '@train-protocol/react';
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
    const { recover, isRecovering } = useRecoverSwap()
    const pendingRecovery = !!(router.query.sourceNetwork && router.query.txHash && !activeHashlock)

    // Restore swap from URL on mount (sourceNetwork + txHash)
    useEffect(() => {
        if (!router.isReady) return

        const sn = router.query.sourceNetwork as string | undefined
        const tx = router.query.txHash as string | undefined
        if (!sn || !tx || activeHashlock) return

        recover(tx, sn)
            .then(hashlock => setActiveHashlock(hashlock))
            .catch(e => console.error('Auto-recovery failed:', e))
    }, [router.isReady, router.query.sourceNetwork, router.query.txHash, recover])

    // Subscribe to the swap lifecycle — hydrates config from persisted data and starts polling
    useSwapProgress(activeHashlock)
    if (pendingRecovery || isRecovering) {
        return (
            <Widget className="space-y-2!">
                <Widget.Content>
                    <div className="flex flex-col items-center justify-center gap-2 w-full min-h-[374px]">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <span className="text-sm text-secondary-text">Recovering swap...</span>
                    </div>
                </Widget.Content>
            </Widget>
        )
    }

    return (
        <TimerProvider>
            <Formik
                initialValues={initialValues}
                onSubmit={() => { }}
            >
                <AtmoicSteps type='widget' />
            </Formik>
        </TimerProvider>
    )
}

export { getServerSideProps };

export default AtomicPage
