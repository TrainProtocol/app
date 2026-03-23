import React, { FC, useMemo } from "react";
import { useSwapData } from "@/hooks/useSwapData";
import { useSwapState } from "@train-protocol/react";
import { StepStatus, TimelineStep } from "./progressTypes";
import { LockStatus } from "@train-protocol/sdk";
import { getExplorerUrl } from "@/lib/address";
import NetworkSettings from "@/lib/NetworkSettings";
import { HTLCTransaction } from "@train-protocol/sdk";
import { HTLCStatus } from "@/Models/HTLCStatus";
import { useSolverLockVerification } from "@/hooks/htlc/useSolverLockVerification";
import LockIcon from "@/components/Icons/LockIcon";

// --- Types ---

type GaugeIcon = "check" | "undo" | "circleCheck" | "x" | null;

export type SwapProgress = {
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
    { activeName: "Reveal secret", completeName: "Secret revealed" },
    { activeName: "Receive assets", completeName: "Assets received", linkKey: "redeem" },
];

const REFUND_STEPS: StepTemplate[] = [
    { activeName: "Funds locked", completeName: "Funds locked", linkKey: "source" },
    { activeName: "Timelock expired", completeName: "Timelock expired", isFailed: true },
    { activeName: "Refund", completeName: "Refund completed", linkKey: "refund" },
];

// --- Helpers ---

function buildExplorerLink(networkSlug?: string, txHash?: string | null): string | undefined {
    if (!networkSlug || !txHash) return undefined;
    return getExplorerUrl(NetworkSettings.KnownSettings[networkSlug]?.TransactionExplorerTemplate, txHash);
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
    const { consensusVerifying, consensusVerified } = useSwapState();

    // const lcHashlock = destinationDetailsByLightClient?.data?.hashlock;
    // const solverHashlock = solverLockDetails?.hashlock;

    // if (verifyingByLightClient && !lcHashlock && solverHashlock) {
    //     return (
    //         <div className="flex items-center gap-1 text-sm">
    //             <span>Verifying by Light Client</span>
    //             <LockIcon className="h-4 w-4 text-accent animate-pulse" />
    //         </div>
    //     );
    // }

    // if (lcHashlock && solverHashlock && lcHashlock === solverHashlock) {
    //     return (
    //         <div className="flex items-center gap-1 text-sm">
    //             <span>Verified by</span>
    //             <span className="font-medium text-accent flex items-center gap-1">
    //                 Light Client
    //                 <LockIcon className="h-4 w-4 text-accent" />
    //             </span>
    //         </div>
    //     );
    // }

    if (consensusVerifying) {
        return (
            <div className="flex items-center gap-1 text-sm">
                <span>Verifying with multiple RPCs</span>
                <LockIcon className="h-4 w-4 text-accent animate-pulse" />
            </div>
        );
    }

    if (consensusVerified) {
        return (
            <div className="flex items-center gap-1 text-sm">
                <span>Verified by</span>
                <span className="font-medium text-accent flex items-center gap-1">
                    multiple RPCs
                    <LockIcon className="h-4 w-4 text-accent" />
                </span>
            </div>
        );
    }

    return <span className="text-sm">Verified by RPCs. Reveal your secret to complete the swap.</span>;
};

// --- Main Hook ---

export function useSwapProgress(): SwapProgress {
    const {
        lockTxId,
        refundTxId,
        source_network,
        destination_network,
    } = useSwapData();

    const {
        status: htlcStatus,
        sourceDetails,
        destRedeemTxId: destRedeemTx,
        htlcFromApi,
        consensusVerifying,
    } = useSwapState();

    const { verified, skipped, mismatches } = useSolverLockVerification();

    return useMemo(() => {
        const sourceTxLink = buildExplorerLink(source_network?.caip2Id, lockTxId);
        const solverLockTx = htlcFromApi?.transactions?.find(t => t.type === HTLCTransaction.HTLCLock as string);
        const destTxLink = buildExplorerLink(destination_network?.caip2Id, solverLockTx?.hash);
        const redeemTxLink = buildExplorerLink(destination_network?.caip2Id, destRedeemTx);
        const refundTxLink = buildExplorerLink(source_network?.caip2Id, refundTxId);

        const isRefunded = sourceDetails?.status === LockStatus.Refunded;

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
                    0: { description: "Transaction is confirming on source chain" },
                }),
            };
        }

        // User locked — waiting for solver
        if (htlcStatus === HTLCStatus.UserLocked) {
            return {
                gaugeValue: 25, gaugeIcon: null,
                title: "Transfer in progress",
                subtitle: "Waiting for solver to reserve assets.",
                steps: buildSteps(HAPPY_STEPS, 1, { source: sourceTxLink }, {
                    0: { description: "Transaction confirmed", timelock: sourceDetails?.timelock },
                    1: { description: "Solver is reserving assets on destination" },
                }),
            };
        }

        // Solver lock detected but verification failed — show mismatch error
        if (htlcStatus === HTLCStatus.SolverLockDetected && !verified && !skipped && mismatches.length > 0) {
            return {
                gaugeValue: 50, gaugeIcon: "x",
                title: "Solver lock mismatch",
                subtitle: "Do not reveal your secret. Wait for the timelock to expire, then refund.",
                steps: buildSteps(HAPPY_STEPS, 1, { source: sourceTxLink, dest: destTxLink }, {
                    0: { timelock: sourceDetails?.timelock },
                    1: { name: "Reservation mismatch", status: StepStatus.Failed, description: mismatches.join('. ') },
                    2: { status: StepStatus.Upcoming },
                }),
            };
        }

        // Solver lock detected — user can reveal secret after verification
        if (htlcStatus === HTLCStatus.SolverLockDetected) {
            // During consensus, step 1 (Assets reserved) is current; after consensus, step 2 (Reveal secret) is current
            const currentStep = consensusVerifying ? 1 : 2;
            const solverLockOverrides: Record<number, StepOverride> = {
                0: { timelock: sourceDetails?.timelock },
                1: { description: <VerificationStatus /> },
            };
            if (!consensusVerifying) {
                solverLockOverrides[2] = { description: "Verify solver lock and reveal secret" };
            }
            return {
                gaugeValue: 50, gaugeIcon: null,
                title: "Transfer in progress",
                subtitle: consensusVerifying
                    ? "Verifying solver lock with multiple nodes..."
                    : "Verify solver lock and reveal your secret.",
                steps: buildSteps(HAPPY_STEPS, currentStep, { source: sourceTxLink, dest: destTxLink }, solverLockOverrides),
            };
        }

        // Secret revealed — waiting for solver claim
        if (htlcStatus === HTLCStatus.SecretRevealed) {
            return {
                gaugeValue: 75, gaugeIcon: null,
                title: "Releasing assets",
                subtitle: "You will receive your assets shortly.",
                steps: buildSteps(HAPPY_STEPS, 3, { source: sourceTxLink, dest: destTxLink }, {
                    0: { timelock: sourceDetails?.timelock },
                    1: { description: <VerificationStatus /> },
                    3: { name: "Receiving assets", status: StepStatus.Current, description: "Solver is claiming on destination" },
                }),
            };
        }

        // Manual claim required — solver didn't redeem on destination
        if (htlcStatus === HTLCStatus.ManualClaimRequired) {
            return {
                gaugeValue: 85, gaugeIcon: null,
                title: "Action required",
                subtitle: "Claim your assets manually on the destination chain.",
                steps: buildSteps(HAPPY_STEPS, 3, { source: sourceTxLink, dest: destTxLink }, {
                    1: { description: <VerificationStatus /> },
                    3: { name: "Claim assets", status: !redeemTxLink ? StepStatus.Upcoming : StepStatus.Current, description: "Solver didn't complete the claim. You can claim your assets manually." },
                }),
            };
        }

        // Swap complete
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
        // Timelock expired — awaiting refund action
        if (htlcStatus === HTLCStatus.TimelockExpired && !isRefunded && !refundTxId) {
            return {
                gaugeValue: 25, gaugeIcon: "x",
                title: "Timelock expired",
                subtitle: "The response was not received in time.",
                steps: buildSteps(REFUND_STEPS, 2, { source: sourceTxLink }, {
                    1: { description: "Solver did not respond in time" },
                    2: { status: StepStatus.Upcoming, description: "Cancel & refund to get your assets back" },
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
                    2: { name: "Refund pending", description: "Assets are being returned to your source wallet" },
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

        return { gaugeValue: 0, gaugeIcon: null, title: "Processing", subtitle: null, steps: [] };
    }, [
        htlcStatus,
        lockTxId,
        sourceDetails,
        destRedeemTx,
        refundTxId,
        source_network,
        destination_network,
        htlcFromApi,
        verified,
        skipped,
        mismatches,
        consensusVerifying,
    ]);
}
