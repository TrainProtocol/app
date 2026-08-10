import React, { FC, useMemo } from "react";
import { useActiveSwap } from "@/hooks/useActiveSwap";
import { StepStatus, TimelineStep } from "./progressTypes";
import { LockStatus, HTLCTransaction, HTLCStatus, TrainErrorCode } from "@train-protocol/react";
import { getExplorerUrl } from "@/lib/address";
import { useSolverLockVerification } from "@/hooks/htlc/useSolverLockVerification";
import LockIcon from "@/components/Icons/LockIcon";
import MobileTooltip from "@/components/Modal/mobileTooltip";

// --- Types ---

type GaugeIcon = "check" | "undo" | "circleCheck" | "x" | null;

export type SwapTimeline = {
    gaugeValue: number;
    gaugeIcon: GaugeIcon;
    title: string;
    subtitle: string | null;
    steps: TimelineStep[];
};

type TxLinks = Record<string, string | undefined>;

type StepTemplate = {
    activeName: string;
    completeName: string;
    linkKey?: string;
    isFailed?: boolean;
};

type StepOverride = {
    description?: React.ReactNode;
    name?: string;
    status?: StepStatus;
    timelock?: number;
};

// --- Step Templates ---

const HAPPY_STEPS: StepTemplate[] = [
    { activeName: "Lock funds", completeName: "Funds locked", linkKey: "source" },
    { activeName: "Awaiting reservation", completeName: "Assets reserved", linkKey: "dest" },
    { activeName: "Receive assets", completeName: "Assets received", linkKey: "redeem" },
];

const REFUND_STEPS: StepTemplate[] = [
    { activeName: "Funds locked", completeName: "Funds locked", linkKey: "source" },
    { activeName: "Time expired", completeName: "Time expired", isFailed: true },
    { activeName: "Refund", completeName: "Refund completed", linkKey: "refund" },
];

// --- Helpers ---

function buildExplorerLink(network?: { explorerUrlTemplate?: { transaction?: string } } | null, txHash?: string | null): string | undefined {
    if (!network || !txHash) return undefined;
    return getExplorerUrl(network.explorerUrlTemplate?.transaction, txHash);
}

function buildSteps(
    templates: StepTemplate[],
    currentIndex: number,
    links: TxLinks,
    overrides?: Record<number, StepOverride>,
): TimelineStep[] {
    return templates.map((tmpl, i) => {
        const override = overrides?.[i];

        let status: StepStatus;
        if (override?.status) {
            status = override.status;
        } else if (currentIndex === -1) {
            status = tmpl.isFailed ? StepStatus.Failed : StepStatus.Complete;
        } else if (i < currentIndex) {
            status = tmpl.isFailed ? StepStatus.Failed : StepStatus.Complete;
        } else if (i === currentIndex) {
            status = StepStatus.Current;
        } else {
            status = StepStatus.Upcoming;
        }

        const isCompleteOrFailed = status === StepStatus.Complete || status === StepStatus.Failed;
        let name = isCompleteOrFailed ? tmpl.completeName : tmpl.activeName;
        if (override?.name) name = override.name;

        const step: TimelineStep = { name, status };

        if (tmpl.linkKey && status !== StepStatus.Upcoming) {
            const link = links[tmpl.linkKey];
            if (link) step.txLink = link;
        }

        if (override?.description) step.description = override.description;
        if (override?.timelock) step.timelock = override.timelock;

        return step;
    });
}

// --- Verification Status ---

const VerificationStatus: FC = () => {
    const { consensusVerifying, consensusVerified, consensusFailed, verifiedNodeCount, verificationSource } = useActiveSwap();

    if (consensusFailed) {
        return <span className="text-sm text-secondary-text">Couldn't verify with RPCs</span>;
    }

    if (consensusVerifying) {
        return (
            <div className="flex items-center gap-1 text-sm">
                <span>{verificationSource === 'lightClient' ? 'Verifying with light client' : 'Verifying with multiple RPCs'}</span>
                <LockIcon className="h-4 w-4 text-primary animate-pulse" />
            </div>
        );
    }

    if (consensusVerified) {
        if (verificationSource === 'lightClient') {
            return (
                <div className="flex items-center gap-1 text-sm">
                    <span>Verified by</span>
                    <MobileTooltip
                        trigger={
                            <span className="font-medium text-primary flex items-center gap-1 cursor-help">
                                light client
                                <LockIcon className="h-4 w-4 text-primary" />
                            </span>
                        }
                    >
                        <div className="space-y-1">
                            <a
                                href="https://github.com/a16z/helios"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block font-medium underline underline-offset-2 hover:opacity-80"
                            >
                                Helios light client
                            </a>
                            <p className="text-xs opacity-70">
                                An open-source Ethereum light client running in your browser. It cryptographically
                                verified this reservation against Ethereum consensus, without trusting any single RPC provider.
                            </p>
                        </div>
                    </MobileTooltip>
                </div>
            );
        }
        if (verificationSource === 'manual') {
            return (
                <div className="flex items-center gap-1 text-sm">
                    <span>Verified manually</span>
                    <LockIcon className="h-4 w-4 text-primary" />
                </div>
            );
        }
        const label = verifiedNodeCount === 1
            ? '1 RPC'
            : `${verifiedNodeCount} RPCs`;
        return (
            <div className="flex items-center gap-1 text-sm">
                <span>Verified by</span>
                <span className="font-medium text-primary flex items-center gap-1">
                    {label}
                    <LockIcon className="h-4 w-4 text-primary" />
                </span>
            </div>
        );
    }

    return <span className="text-sm">Verifying…</span>;
};

// --- Main Hook ---

export function useSwapTimeline(): SwapTimeline {
    const {
        txId: lockTxId,
        refundTxId,
        sourceNetwork,
        destinationNetwork,
        status: htlcStatus,
        sourceDetails,
        destRedeemTxId: destRedeemTx,
        htlcFromApi,
        consensusVerified,
        error
    } = useActiveSwap();

    const { verified, skipped, mismatches } = useSolverLockVerification();

    return useMemo(() => {
        const sourceTxLink = buildExplorerLink(sourceNetwork, lockTxId);
        const solverLockTx = htlcFromApi?.transactions?.find(t => t.type === HTLCTransaction.HTLCLock as string);
        const destTxLink = buildExplorerLink(destinationNetwork, solverLockTx?.hash);
        const redeemTxLink = buildExplorerLink(destinationNetwork, destRedeemTx);
        const refundTxLink = buildExplorerLink(sourceNetwork, refundTxId);

        const isRefunded = sourceDetails?.status === LockStatus.Refunded;

        const isUserLockFailed = error?.code === TrainErrorCode.UserLockTransactionFailed

        // Timelock expired — awaiting refund action
        if (htlcStatus === HTLCStatus.TimelockExpired && !isRefunded && !refundTxId) {
            return {
                gaugeValue: 25, gaugeIcon: "x",
                title: "Swap timed out",
                subtitle: "No response in time.",
                steps: buildSteps(REFUND_STEPS, 2, { source: sourceTxLink }, {
                    1: { description: "No response in time" },
                    2: { status: StepStatus.Upcoming, description: "Cancel to get your assets back" },
                }),
            };
        }

        // Refund tx submitted — processing
        if (htlcStatus === HTLCStatus.TimelockExpired && refundTxId && !isRefunded) {
            return {
                gaugeValue: 50, gaugeIcon: "undo",
                title: "Processing refund",
                subtitle: "Your refund is being processed.",
                steps: buildSteps(REFUND_STEPS, 2, { source: sourceTxLink }, {
                    2: { name: "Refund pending", description: "Returning assets to your wallet" },
                }),
            };
        }

        // Refund complete
        if (htlcStatus === HTLCStatus.Refunded) {
            return {
                gaugeValue: 100, gaugeIcon: "undo",
                title: "Refund complete",
                subtitle: "Your assets have been returned to your wallet.",
                steps: buildSteps(REFUND_STEPS, -1, { refund: refundTxLink, source: sourceTxLink }),
            };
        }

        // Ordered above failureReason so solver-side post-redeem errors don't mask a swap the user can already see completed on-chain.
        if (htlcStatus === HTLCStatus.RedeemCompleted) {
            return {
                gaugeValue: 100, gaugeIcon: "check",
                title: "Swap complete",
                subtitle: "Your assets have been sent to your address.",
                steps: buildSteps(HAPPY_STEPS, -1, { redeem: redeemTxLink, source: sourceTxLink, dest: destTxLink }, {
                    1: { description: <VerificationStatus /> },
                }),
            };
        }

        // API error — overlay on current progress
        if (htlcFromApi?.failureReason) {
            const currentIndex = solverLockTx ? 2 : 1
            return {
                gaugeValue: 50, gaugeIcon: "x" as GaugeIcon,
                title: "Something went wrong",
                subtitle: htlcFromApi.failureReason,
                steps: buildSteps(HAPPY_STEPS, currentIndex, { source: sourceTxLink, dest: destTxLink }, {
                    0: { timelock: sourceDetails?.timelock },
                    1: { description: solverLockTx ? <VerificationStatus /> : null, status: solverLockTx ? StepStatus.Complete : StepStatus.Failed },
                }),
            };
        }

        // Initial (no tx yet)
        if (htlcStatus === HTLCStatus.Initial && !lockTxId) {
            return { gaugeValue: 0, gaugeIcon: null, title: "Ready to swap", subtitle: null, steps: [] };
        }

        // Initial (tx confirming)
        if (htlcStatus === HTLCStatus.Initial) {
            return {
                gaugeValue: 0, gaugeIcon: null,
                title: "Confirming transaction",
                subtitle: "Your transaction is being confirmed on-chain.",
                steps: buildSteps(HAPPY_STEPS, 0, { source: sourceTxLink }, {
                    0: { status: isUserLockFailed ? StepStatus.Failed : StepStatus.Current, name: isUserLockFailed ? "Lock funds failed" : "Lock funds", description: isUserLockFailed ? error?.message : "Transaction is confirming on source chain" },
                }),
            };
        }

        // User locked — waiting for solver
        if (htlcStatus === HTLCStatus.UserLocked) {
            return {
                gaugeValue: 25, gaugeIcon: null,
                title: "Transfer in progress",
                subtitle: "Reserving assets on destination…",
                steps: buildSteps(HAPPY_STEPS, 1, { source: sourceTxLink }, {
                    0: { description: "Transaction confirmed", timelock: sourceDetails?.timelock },
                    1: { description: "Reserving assets…" },
                }),
            };
        }

        // Solver lock detected but verification failed — show mismatch error
        if (htlcStatus === HTLCStatus.SolverLockDetected && !verified && !skipped && mismatches.length > 0) {
            return {
                gaugeValue: 50, gaugeIcon: "x",
                title: "Reservation mismatch",
                subtitle: "You can refund once the time expires.",
                steps: buildSteps(HAPPY_STEPS, 1, { source: sourceTxLink, dest: destTxLink }, {
                    0: { timelock: sourceDetails?.timelock },
                    1: { name: "Reservation mismatch", status: StepStatus.Failed, description: mismatches.join('. ') },
                }),
            };
        }

        // Solver lock detected — verifying and auto-revealing under the hood
        if (htlcStatus === HTLCStatus.SolverLockDetected) {
            const reservationVerified = consensusVerified && verified;
            return {
                gaugeValue: 50, gaugeIcon: null,
                title: "Transfer in progress",
                subtitle: reservationVerified ? "Reservation verified. Preparing asset release…" : "Verifying transfer…",
                steps: buildSteps(HAPPY_STEPS, 1, { source: sourceTxLink, dest: destTxLink }, {
                    0: { timelock: sourceDetails?.timelock },
                    1: {
                        name: reservationVerified ? "Assets reserved" : "Verifying reservation",
                        status: reservationVerified ? StepStatus.Complete : StepStatus.Current,
                        description: <VerificationStatus />,
                    },
                }),
            };
        }

        // Secret revealed — waiting for solver claim
        if (htlcStatus === HTLCStatus.SecretRevealed) {
            return {
                gaugeValue: 75, gaugeIcon: null,
                title: "Releasing assets",
                subtitle: "You will receive your assets shortly.",
                steps: buildSteps(HAPPY_STEPS, 2, { source: sourceTxLink, dest: destTxLink }, {
                    0: { timelock: sourceDetails?.timelock },
                    1: { description: <VerificationStatus /> },
                    2: { name: "Receiving assets", status: StepStatus.Current, description: "Finalizing on destination…" },
                }),
            };
        }

        // Manual claim required — solver didn't redeem on destination
        if (htlcStatus === HTLCStatus.ManualClaimRequired) {
            return {
                gaugeValue: 85, gaugeIcon: null,
                title: "Action required",
                subtitle: "Claim your assets manually to finish.",
                steps: buildSteps(HAPPY_STEPS, 2, { source: sourceTxLink, dest: destTxLink }, {
                    1: { description: <VerificationStatus /> },
                    2: { name: "Claim assets", status: !redeemTxLink ? StepStatus.Upcoming : StepStatus.Current, description: "The transfer didn't complete automatically. Claim manually to finish." },
                }),
            };
        }

        return { gaugeValue: 0, gaugeIcon: null, title: "Processing", subtitle: null, steps: [] };
    }, [
        htlcStatus,
        lockTxId,
        sourceDetails,
        destRedeemTx,
        refundTxId,
        sourceNetwork,
        destinationNetwork,
        htlcFromApi,
        consensusVerified,
        verified,
        skipped,
        mismatches,
        error
    ]);
}
