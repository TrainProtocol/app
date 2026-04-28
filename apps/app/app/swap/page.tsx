"use client";

import React, { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Formik } from "formik";
import { TimerProvider } from "@/context/timerContext";
import AtmoicSteps from "@/components/Swap/AtomicChat";
import { Widget } from "@/components/Widget/Index";
import { SwapLoading } from "@/components/Swap/AtomicChat/AtomicContent";
import { SearchX } from "lucide-react";
import { parseSwapQuery } from "@/helpers/swapUrl";
import { useQueryState } from "@/context/query";
import { generateSwapInitialValues } from "@/lib/generateSwapInitialValues";
import { useSettingsState } from "@/context/settings";
import { useSwapStore } from "@/stores/swapStore";
import { useSwapProgress, useRecoverSwap } from "@train-protocol/react";
import type { SwapFormValues } from "@/components/DTOs/SwapFormValues";

export default function SwapPage() {
    const searchParams = useSearchParams();
    const query = useQueryState();
    const settingsState = useSettingsState();
    const initialValues: SwapFormValues = generateSwapInitialValues(settingsState, query ?? {});
    const activeHashlock = useSwapStore(s => s.activeHashlock);
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock);
    const { recover, isRecovering, error: recoverError } = useRecoverSwap();
    const recoveryAttemptedRef = useRef<string | null>(null);

    const { sourceNetwork, txHash } = parseSwapQuery(searchParams);
    const pendingRecovery = !!(sourceNetwork && txHash && !activeHashlock && !recoverError);

    useEffect(() => {
        if (!sourceNetwork || !txHash || activeHashlock) return;
        const key = `${sourceNetwork}:${txHash}`;
        if (recoveryAttemptedRef.current === key) return;
        recoveryAttemptedRef.current = key;
        let cancelled = false;
        recover(txHash, sourceNetwork)
            .then(hashlock => { if (!cancelled) setActiveHashlock(hashlock); })
            .catch(e => { if (!cancelled) console.error("Auto-recovery failed:", e); });
        return () => { cancelled = true; };
    }, [sourceNetwork, txHash, activeHashlock, recover, setActiveHashlock]);

    useSwapProgress(activeHashlock);

    if (pendingRecovery || isRecovering) {
        return (
            <Widget className="space-y-2!">
                <Widget.Content>
                    <SwapLoading message="Recovering swap..." />
                </Widget.Content>
            </Widget>
        );
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
        );
    }

    return (
        <TimerProvider>
            <Formik initialValues={initialValues} onSubmit={() => { }}>
                <AtmoicSteps type="widget" />
            </Formik>
        </TimerProvider>
    );
}
