"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AtmoicSteps from "@/components/Swap/AtomicChat";
import { Widget } from "@/components/Widget/Index";
import { SwapLoading } from "@/components/Swap/AtomicChat/AtomicContent";
import { ArrowLeft, SearchX } from "lucide-react";
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper";
import { parseSwapQuery } from "@/helpers/swapUrl";
import { useSwapStore } from "@/stores/swapStore";
import { useSwapProgress, useRecoverSwap } from "@train-protocol/react";

export default function SwapPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
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
        recover(txHash, sourceNetwork)
            .then(setActiveHashlock)
            .catch(e => console.error("Auto-recovery failed:", e));
    }, [sourceNetwork, txHash, activeHashlock, recover, setActiveHashlock]);

    useSwapProgress(activeHashlock);

    const goBack = useCallback(() => {
        if (window?.['navigation']?.['canGoBack']) {
            router.back();
            return;
        }
        const sp = new URLSearchParams(window.location.search);
        router.push(buildHrefWithPersistantParams("/", sp));
    }, [router]);

    let body: React.ReactNode;
    if (pendingRecovery || isRecovering) {
        body = (
            <Widget className="space-y-2!">
                <Widget.Content>
                    <SwapLoading message="Loading..." />
                </Widget.Content>
            </Widget>
        );
    } else if (recoverError && !activeHashlock) {
        body = (
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
    } else {
        body = <AtmoicSteps type="widget" />;
    }

    return (
        <div className="relative w-full">
            <div className="hidden md:flex absolute -top-12 left-0 z-10">
                <button
                    type="button"
                    onClick={goBack}
                    aria-label="Go back"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-text bg-secondary-700 hover:bg-secondary-500 transition-colors rounded-xl px-3 py-2 border border-border"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back</span>
                </button>
            </div>
            {body}
        </div>
    );
}
