import { ReactNode } from "react"
import { HelpCircle } from "lucide-react"
import MobileTooltip from "../../Modal/mobileTooltip"
import { formatCountdown, useCountdown } from "../../../hooks/useCountdown"

const TimelockTimer = ({ timelock, children }: { timelock: number, children?: ReactNode }) => {
    const { secondsRemaining, started } = useCountdown(timelock)

    return (
        started &&
        <MobileTooltip
            trigger={
                children
                    ? children
                    : <div className="px-2.5 py-0.5 rounded-xl bg-opacity-0 hover:bg-opacity-100 transition-all duration-200 bg-secondary-400 hover:bg-secondary-300 text-sm text-secondary-text w-max">
                        <div className="flex items-center gap-1.5">
                            <p>Refund</p>
                            <HelpCircle className="h-4 w-4" />
                        </div>
                    </div>
            }
        >
            <div className="space-y-1">
                <p className="text-sm">
                    <span>Refund available in</span> <span className="w-9">{formatCountdown(secondsRemaining)}</span>
                </p>
                <p className="text-xs opacity-70">If the swap doesn't complete in time, you can cancel and refund.</p>
            </div>
        </MobileTooltip>
    )
}

export default TimelockTimer
