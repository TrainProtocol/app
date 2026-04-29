import { HTLCStatus } from '@train-protocol/react'
import CircleCheckIcon from '@/components/Icons/CircleCheckIcon'
import { Badge } from '@/components/shadcn/badge'

export default function StatusIcons({ status }: { status: HTLCStatus | undefined }) {
    switch (status) {
        case HTLCStatus.RedeemCompleted:
            return (
                <Badge className="bg-success-foreground/15 text-success-foreground">
                    <CircleCheckIcon />
                    Completed
                </Badge>
            )
        case HTLCStatus.Refunded:
            return (
                <Badge className="bg-success-foreground/15 text-success-foreground">
                    <CircleCheckIcon />
                    Refund Completed
                </Badge>
            )
        case HTLCStatus.UserLocked:
        case HTLCStatus.SolverLockDetected:
        case HTLCStatus.SecretRevealed:
            return (
                <Badge className="gap-1.5 bg-blue-500/15 text-blue-400">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500" />
                    </span>
                    In Progress
                </Badge>
            )
        case HTLCStatus.ManualClaimRequired:
            return (
                <Badge className="bg-warning-foreground/15 text-warning-foreground">
                    Action Required
                </Badge>
            )
        case HTLCStatus.TimelockExpired:
            return (
                <Badge className="bg-warning-foreground/15 text-warning-foreground">
                    Expired
                </Badge>
            )
        default:
            return <span className="text-primary-text-tertiary">—</span>
    }
}
