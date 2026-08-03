import { FC, ReactNode } from "react"

type StepBodyProps = {
    info: ReactNode
    actions: ReactNode
    gap?: string
    centerOverlay?: boolean
    overlayActionMt?: string
}

export const StepBody: FC<StepBodyProps> = ({
    info,
    actions,
    gap = "gap-5",
    centerOverlay = true,
    overlayActionMt = "",
}) => {
    const infoClasses = centerOverlay
        ? `flex-1 flex flex-col items-center justify-center ${gap} w-full`
        : `flex-1 flex flex-col ${gap}`
    return (
        <div className="flex flex-col min-h-full gap-5">
            <div className={infoClasses}>{info}</div>
            <div className={`w-full ${overlayActionMt}`.trim()}>{actions}</div>
        </div>
    )
}
