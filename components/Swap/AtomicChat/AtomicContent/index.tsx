import { FC, useEffect } from "react";
import { HTLCStatus, useAtomicState } from "../../../../context/atomicContext";
import CheckedIcon from "../../../Icons/CheckedIcon";
import SuccessIcon from "../../../Icons/SuccessIcon";
import SpinIcon from "../../../Icons/spinIcon";
import LockIcon from "../../../Icons/LockIcon";
import XCircle from "../../../Icons/CircleX";
import Summary from "./Summary";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePulsatingCircles } from "../../../../context/PulsatingCirclesContext";
import { SwapQuote } from "../../../../lib/trainApiClient";
import SwapQuoteComp from "@/components/FeeDetails/SwapQuote";
import { SwapFormValues } from "@/components/DTOs/SwapFormValues";
import { LockStatus } from "../../../../Models/phtlc/PHTLC";
import { getExplorerUrl } from "@/lib/address";
import NetworkSettings from "@/lib/NetworkSettings";
import TimelockTimer from "../Timer";

type AtomicContentProps = {
    quote?: SwapQuote
    isQuoteLoading?: boolean
}

const AtomicContent: FC<AtomicContentProps> = ({ quote, isQuoteLoading = false }) => {
    const {
        htlcStatus: commitStatus, destination_network, source_network,
        source_asset, destination_asset, amount,
        solverLockDetails, destinationDetailsByLightClient, updateCommit,
        hashlock,
    } = useAtomicState()

    const { setPulseState } = usePulsatingCircles();

    const isInitial = commitStatus === HTLCStatus.Initial

    // Centralized pulse state
    useEffect(() => {
        switch (commitStatus) {
            case HTLCStatus.RedeemCompleted:
                setPulseState("completed");
                break;
            case HTLCStatus.SecretRevealed:
            case HTLCStatus.UserLocked:
                setPulseState("pulsing");
                break;
            default:
                setPulseState("initial");
        }
    }, [commitStatus]);

    // Hashlock mismatch safety check (preserved from old LpLockingAssets step)
    useEffect(() => {
        const lcHash = destinationDetailsByLightClient?.data?.hashlock
        const solverHash = solverLockDetails?.hashlock
        if (lcHash && solverHash && lcHash !== solverHash) {
            updateCommit('error', { buttonText: 'Ok', message: 'Hashlock mismatch, please wait for refund.' })
        }
    }, [solverLockDetails, destinationDetailsByLightClient]);

    const values: SwapFormValues = {
        amount: amount?.toString(),
        from: source_network,
        to: destination_network,
        fromCurrency: source_asset,
        toCurrency: destination_asset,
    }

    return (
        <>
            <Summary quote={quote} isQuoteLoading={isQuoteLoading} />

            {isInitial && (
                <SwapQuoteComp values={values} quote={quote} isQuoteLoading={isQuoteLoading} />
            )}

            {(!isInitial || hashlock) && <SwapStateContent />}
        </>
    )
}

// Renders state-specific content based on commitStatus
const SwapStateContent: FC = () => {
    const {
        htlcStatus: commitStatus, lockTxId, sourceDetails, solverLockDetails,
        source_network, destination_network,
        destRedeemTx, refundTxId,
        destinationDetailsByLightClient, verifyingByLightClient,
    } = useAtomicState()

    const isRefunded = commitStatus === HTLCStatus.TimelockExpired
        && sourceDetails?.status === LockStatus.Refunded

    switch (commitStatus) {
        case HTLCStatus.UserLocked:
            return (
                <StateCard
                    icon={<SpinIcon className="h-5 w-5 animate-reverse-spin text-accent" />}
                    title="Waiting for solver"
                    description="The solver is reserving assets for you on the destination chain."
                    timelock={sourceDetails?.timelock}
                    txLink={buildExplorerLink(source_network?.slug, lockTxId)}
                />
            )

        case HTLCStatus.SolverLockDetected:
            return (
                <StateCard
                    icon={<CheckedIcon className="h-5 w-5 text-accent" />}
                    title="Assets reserved"
                    description={
                        <VerificationStatus
                            solverLockDetails={solverLockDetails}
                            destinationDetailsByLightClient={destinationDetailsByLightClient}
                            verifyingByLightClient={verifyingByLightClient}
                        />
                    }
                />
            )

        case HTLCStatus.SecretRevealed:
            return (
                <StateCard
                    icon={<SpinIcon className="h-5 w-5 animate-reverse-spin text-accent" />}
                    title="Releasing assets"
                    description="You will receive your assets at the destination address shortly."
                />
            )

        case HTLCStatus.RedeemCompleted:
            return (
                <CompletionScreen
                    icon={<CheckedIcon className="h-16 w-auto text-accent" />}
                    title="Swap Completed"
                    description="Your assets have been sent to the destination address."
                    txLink={buildExplorerLink(destination_network?.slug, destRedeemTx)}
                />
            )

        case HTLCStatus.TimelockExpired:
            if (isRefunded) {
                return (
                    <CompletionScreen
                        icon={<SuccessIcon className="h-16 w-auto" />}
                        title="Refund Completed"
                        description="Your assets have been returned to your source wallet."
                        txLink={buildExplorerLink(source_network?.slug, refundTxId)}
                    />
                )
            }
            return (
                <StateCard
                    icon={<XCircle className="h-5 w-5" />}
                    title="Timelock Expired"
                    description="The response was not received in time. Cancel & refund to receive your assets back."
                />
            )

        case HTLCStatus.Initial:
            if (!lockTxId) return null
            return (
                <StateCard
                    icon={<SpinIcon className="h-5 w-5 animate-reverse-spin text-accent" />}
                    title="Waiting for confirmation"
                    description="Your transaction is being confirmed on-chain."
                    txLink={buildExplorerLink(source_network?.slug, lockTxId)}
                />
            )

        default:
            return null
    }
}

// Card for in-progress states
type StateCardProps = {
    icon: React.ReactNode
    title: string
    description: React.ReactNode
    txLink?: string
    timelock?: number
}

const StateCard: FC<StateCardProps> = ({ icon, title, description, txLink, timelock }) => (
    <div className="inline-flex items-center justify-between w-full bg-secondary-700 rounded-2xl p-3 pr-5">
        <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
                {icon}
                <span className="text-primary-text text-base leading-5">{title}</span>
            </div>
            <div className="text-sm text-primary-text-tertiary">{description}</div>
        </div>
        <div className="flex items-center gap-1">
            {timelock && (
                <TimelockTimer timelock={timelock}>
                    <span className="bg-secondary-500 hover:bg-secondary-600 rounded-full p-1 px-4 text-xs cursor-default">Refund</span>
                </TimelockTimer>
            )}
            {txLink && <TxLink txLink={txLink} />}
        </div>
    </div>
)

// Screen for terminal states (success / refund)
type CompletionScreenProps = {
    icon: React.ReactNode
    title: string
    description: string
    txLink?: string
}

const CompletionScreen: FC<CompletionScreenProps> = ({ icon, title, description, txLink }) => (
    <div className="flex flex-col gap-6 pt-10 pb-4 items-center">
        {icon}
        <div className="text-center space-y-2">
            <p className="text-3xl text-primary-text">{title}</p>
            <p className="text-base text-secondary-text max-w-xs mx-auto">{description}</p>
            {txLink && (
                <div className="w-full flex justify-center pt-2">
                    <TxLink txLink={txLink} label="View transaction" />
                </div>
            )}
        </div>
    </div>
)

// Light Client / RPC verification display
const VerificationStatus: FC<{
    solverLockDetails?: { hashlock?: string, sender?: string },
    destinationDetailsByLightClient?: { data?: { hashlock?: string }, error?: string },
    verifyingByLightClient?: boolean,
}> = ({ solverLockDetails, destinationDetailsByLightClient, verifyingByLightClient }) => {
    const lcHashlock = destinationDetailsByLightClient?.data?.hashlock
    const solverHashlock = solverLockDetails?.hashlock

    if (verifyingByLightClient && !lcHashlock && solverHashlock) {
        return (
            <div className="flex items-center gap-1 text-sm">
                <span>Verifying by Light Client</span>
                <LockIcon className="h-4 w-4 text-accent animate-pulse" />
            </div>
        )
    }

    if (lcHashlock && solverHashlock && lcHashlock === solverHashlock) {
        return (
            <div className="flex items-center gap-1 text-sm">
                <span>Verified by</span>
                <span className="font-medium text-accent flex items-center gap-1">
                    Light Client
                    <LockIcon className="h-4 w-4 text-accent" />
                </span>
            </div>
        )
    }

    return <span className="text-sm">Verified by RPCs. Reveal your secret to complete the swap.</span>
}

// Reusable transaction link
const TxLink: FC<{ txLink: string, label?: string }> = ({ txLink, label }) => (
    <Link
        href={txLink}
        target="_blank"
        className="p-1 px-4 rounded-full bg-secondary-700 flex gap-2 items-center text-secondary-text hover:bg-secondary-600 transition-colors"
    >
        {label && <p>{label}</p>}
        <ExternalLink className="h-4 w-auto" />
    </Link>
)

function buildExplorerLink(networkSlug?: string, txHash?: string | null): string | undefined {
    if (!networkSlug || !txHash) return undefined
    return getExplorerUrl(NetworkSettings.KnownSettings[networkSlug]?.TransactionExplorerTemplate, txHash)
}

export default AtomicContent;