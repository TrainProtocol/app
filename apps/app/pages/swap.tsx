import Layout from '../components/layout';
import { InferGetServerSidePropsType } from 'next';
import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Formik } from 'formik';
import { TimerProvider } from '../context/timerContext';
import AtmoicSteps from '../components/Swap/AtomicChat'
import { Widget } from '../components/Widget/Index'
import { SwapLoading } from '../components/Swap/AtomicChat/AtomicContent'
import { SearchX } from 'lucide-react'
import { getServerSideProps } from '../helpers/getSettings';
import { parseSwapQuery } from '../helpers/swapUrl';
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
    const { recover, isRecovering, error: recoverError } = useRecoverSwap()
    const recoveryAttemptedRef = useRef(false)
    const { sourceNetwork: sn, txHash: tx } = parseSwapQuery(router.query)
    const pendingRecovery = !!(sn && tx && !activeHashlock && !recoverError)

    // Restore swap from URL on mount (sourceNetwork + txHash)
    useEffect(() => {
        if (!router.isReady || !sn || !tx || activeHashlock || recoveryAttemptedRef.current) return

        recoveryAttemptedRef.current = true
        recover(tx, sn)
            .then(hashlock => setActiveHashlock(hashlock))
            .catch(e => console.error('Auto-recovery failed:', e))
    }, [router.isReady, sn, tx, recover])

    // Subscribe to the swap lifecycle — hydrates config from persisted data and starts polling
    useSwapProgress(activeHashlock)
    if (pendingRecovery || isRecovering) {
        return (
            <Widget className="space-y-2!">
                <Widget.Content>
                    <SwapLoading message="Recovering swap..." />
                </Widget.Content>
            </Widget>
        )
    }

    if (recoverError && !activeHashlock) {
        return (
            <Widget className="space-y-2!">
                <Widget.Content>
                    <div className="flex flex-col items-center justify-center gap-2 w-full min-h-[374px]">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                            <SearchX className="h-10 w-10 text-primary" aria-hidden="true" />
                        </span>
                        <span className="font-medium text-primary-text text-xl">Recovery failed</span>
                        <span className="text-sm text-secondary-text text-center">
                            {recoverError.message}
                        </span>
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
