"use client"

import * as React from "react"
import { classNames } from "../utils/classNames"

const Separator = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        orientation?: "horizontal" | "vertical"
        decorative?: boolean
    }
>(
    (
        { className, orientation = "horizontal", decorative = true, ...props },
        ref
    ) => (
        <div
            ref={ref}
            role={decorative ? "none" : "separator"}
            aria-orientation={!decorative ? orientation : undefined}
            className={classNames(
                "shrink-0 bg-secondary-500",
                orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
                className
            )}
            {...props}
        />
    )
)
Separator.displayName = "Separator"

export { Separator }
