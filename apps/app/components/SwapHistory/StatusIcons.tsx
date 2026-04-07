import { HTLCStatus } from '@train-protocol/react'
import CircleCheckIcon from '@/components/Icons/CircleCheckIcon'
import { Badge } from '@/components/shadcn/badge'

export default function StatusIcons({ status }: { status: HTLCStatus | undefined }) {
    switch (status) {
        case HTLCStatus.RedeemCompleted:
            return (
                <Badge className="gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-success-background text-success-foreground">
                    <CircleCheckIcon />
                    Completed
                </Badge>
            )
        case HTLCStatus.Refunded:
            return (
                <Badge className="gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-success-background text-success-foreground">
                    <CircleCheckIcon />
                    Refund Completed
                </Badge>
            )
        case HTLCStatus.UserLocked:
        case HTLCStatus.SolverLockDetected:
        case HTLCStatus.SecretRevealed:
            return (
                <Badge className="gap-1.5 font-bold rounded-md px-1.5 py-0.5 text-sm bg-blue-500/15 text-blue-400">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                    </span>
                    In Progress
                </Badge>
            )
        case HTLCStatus.ManualClaimRequired:
            return (
                <Badge className="gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-yellow-500/15 text-yellow-400">
                    Action Required
                </Badge>
            )
        case HTLCStatus.TimelockExpired:
            return (
                <Badge className="gap-1 font-bold rounded-md px-1.5 py-0.5 text-sm bg-yellow-500/15 text-yellow-400">
                    Expired
                </Badge>
            )
        default:
            return <span className="text-primary-text-tertiary">—</span>
    }
}
