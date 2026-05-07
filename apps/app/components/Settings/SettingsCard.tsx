import { FC, ReactNode } from "react"
import TestnetBadge from "../TestnetBadge"

type Props = {
    title?: string
    description?: string
    action?: ReactNode
    header?: ReactNode
    icon?: ReactNode
    iconAlign?: "start" | "center"
    children?: ReactNode
    onClick?: () => void
    showTestnetBanner?: boolean
    contentPadding?: boolean
}

const SettingsCard: FC<Props> = ({
    title,
    description,
    action,
    header,
    icon,
    iconAlign = "start",
    children,
    onClick,
    showTestnetBanner,
    contentPadding = true,
}) => {
    const wrapperClassName = "relative bg-secondary-700 md:shadow-md border border-border rounded-3xl sm:overflow-hidden text-left w-full"
    const interactiveClassName = onClick ? " hover:bg-secondary-600 transition-colors cursor-pointer active:animate-press-down-weak" : ""

    const body = (
        <>
            {showTestnetBanner && <TestnetBadge />}
            <div className={contentPadding ? "p-5" : undefined}>
                {header ? (
                    <div>{header}</div>
                ) : (
                    (title || description || action || icon) && (
                        <div className={`flex ${iconAlign === "center" ? "items-center" : "items-start"} justify-between gap-3`}>
                            {icon && <div className="shrink-0">{icon}</div>}
                            <div className="min-w-0 flex-1">
                                {title && <h3 className="text-primary-text text-base font-semibold">{title}</h3>}
                                {description && (
                                    <p className="mt-1 text-sm text-secondary-text">{description}</p>
                                )}
                            </div>
                            {action && <div className="shrink-0">{action}</div>}
                        </div>
                    )
                )}
                {children && <div className={(title || description || action || header) ? "mt-4" : undefined}>{children}</div>}
            </div>
        </>
    )

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={wrapperClassName + interactiveClassName}>
                {body}
            </button>
        )
    }

    return <section className={wrapperClassName}>{body}</section>
}

export default SettingsCard
