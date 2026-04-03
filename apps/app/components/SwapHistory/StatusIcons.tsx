import { HTLCStatus } from '@train-protocol/react'
import CircleCheckIcon from '@/components/Icons/CircleCheckIcon'

export default function StatusIcons({ status }: { status: HTLCStatus | undefined }) {
    switch (status) {
        case HTLCStatus.RedeemCompleted:
            return (
                <span className="inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-success-background text-success-foreground">
                    <CircleCheckIcon />
                    Completed
                </span>
            )
        case HTLCStatus.Refunded:
            return (
                <span className="inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-success-background text-success-foreground">
                    <CircleCheckIcon />
                    Refund Completed
                </span>
            )
        case HTLCStatus.UserLocked:
        case HTLCStatus.SolverLockDetected:
        case HTLCStatus.SecretRevealed:
            return (
                <span className="inline-flex items-center gap-1.5 font-bold rounded-md px-1.5 py-0.5 text-sm bg-blue-500/15 text-blue-400">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                    </span>
                    In Progress
                </span>
            )
        case HTLCStatus.ManualClaimRequired:
            return (
                <span className="inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-yellow-500/15 text-yellow-400">
                    Action Required
                </span>
            )
        case HTLCStatus.TimelockExpired:
            return (
                <span className="inline-flex items-center gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-yellow-500/15 text-yellow-400">
                    Expired
                </span>
            )
        default:
            return <span className="text-primary-text-tertiary">—</span>
    }
}
