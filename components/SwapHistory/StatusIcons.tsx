import { HTLCStatus } from '@/Models/HTLCStatus'
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
        default:
            return <span className="text-primary-text-tertiary">—</span>
    }
}
