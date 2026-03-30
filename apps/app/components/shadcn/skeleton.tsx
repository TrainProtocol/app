"use client"

import { classNames } from "../utils/classNames"

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={classNames("animate-pulse rounded-md bg-secondary-500", className)}
            {...props}
        />
    )
}

export { Skeleton }
