import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { classNames } from "../utils/classNames"

function Tabs({
    className,
    orientation = "horizontal",
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            data-orientation={orientation}
            className={classNames(
                "group/tabs flex gap-2",
                orientation === "horizontal" && "flex-col",
                className
            )}
            {...props}
        />
    )
}

function TabsList({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: "default" | "line" | "underline" }) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            data-variant={variant}
            className={classNames(
                "group/tabs-list inline-flex w-full items-center justify-center text-secondary-text",
                variant === "default" && "h-10 p-[3px] bg-secondary-500 rounded-lg",
                variant === "line" && "h-10 p-[3px] gap-1 bg-transparent rounded-none",
                variant === "underline" && "bg-transparent rounded-none border-b border-secondary-500 p-0 h-auto gap-4 justify-start",
                className
            )}
            {...props}
        />
    )
}

function TabsTrigger({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> & { variant?: "default" | "underline" }) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={classNames(
                variant === "default" && "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium whitespace-nowrap text-secondary-text transition-all hover:text-primary-text focus-visible:border-secondary-400 focus-visible:ring-[3px] focus-visible:ring-secondary-400/50 focus-visible:outline-1 focus-visible:outline-secondary-400 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-actionButtonColor data-[state=active]:text-primary-buttonTextColor data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                variant === "underline" && "inline-flex items-center justify-center px-0 py-2 text-base whitespace-nowrap transition-all border-b-2 text-secondary-text font-medium border-transparent hover:text-primary-text disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-primary-text data-[state=active]:font-bold data-[state=active]:border-primary-500",
                className
            )}
            {...props}
        />
    )
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={classNames("flex-1 text-sm outline-none", className)}
            {...props}
        />
    )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
