"use client";

import React, { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import AtmoicSteps from "@/components/Swap/AtomicChat";
import { Widget } from "@/components/Widget/Index";
import { SwapLoading } from "@/components/Swap/AtomicChat/AtomicContent";
import { SearchX } from "lucide-react";
import { parseSwapQuery } from "@/helpers/swapUrl";
import { useSwapStore } from "@/stores/swapStore";
import { useSwapProgress, useRecoverSwap, isTerminalStatus } from "@train-protocol/react";

export default function SwapPage() {
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

    const { status: htlcStatus } = useSwapProgress(activeHashlock);

    const isTerminalRef = useRef(false);
    isTerminalRef.current = isTerminalStatus(htlcStatus);
    useEffect(() => () => {
        if (isTerminalRef.current) setActiveHashlock(null);
    }, [setActiveHashlock]);

    if (pendingRecovery || isRecovering) {
        return (
            <Widget className="space-y-2!">
                <Widget.Content>
                    <SwapLoading message="Loading..." />
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

    return <AtmoicSteps type="widget" />;
}
