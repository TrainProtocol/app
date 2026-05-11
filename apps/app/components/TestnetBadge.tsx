import { FC } from "react"
import AppSettings from "@/lib/AppSettings"
import { cn } from "@/lib/utils"

type Props = {
    wrapperClassName?: string
    className?: string
    label?: string
}

const TestnetBadge: FC<Props> = ({
    wrapperClassName = "relative z-20 md:hidden",
    className = "absolute -top-1 right-[calc(50%-68px)] py-0.5 px-10 rounded-b-md",
    label = "TESTNET",
}) => {
    if (AppSettings.ApiVersion !== 'sandbox') return null
    return (
        <div className={wrapperClassName}>
            <div className={cn("bg-[#D95E1B] text-xs scale-75 whitespace-nowrap", className)}>
                {label}
            </div>
        </div>
    )
}

export default TestnetBadge
