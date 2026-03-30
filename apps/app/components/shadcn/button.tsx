"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { classNames } from "../utils/classNames"

const BUTTON_BASE = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"

const BUTTON_VARIANTS: Record<string, string> = {
    default: "bg-primary-500 text-primary-buttonTextColor hover:bg-primary-600",
    destructive: "bg-error-foreground text-primary-text hover:bg-error-foreground/90",
    outline: "border border-secondary-400 bg-secondary-700 hover:bg-secondary-500 hover:text-primary-text",
    secondary: "bg-secondary-500 text-primary-text hover:bg-secondary-400",
    ghost: "hover:bg-secondary-500 hover:text-primary-text",
    link: "text-primary-500 underline-offset-4 hover:underline",
}

const BUTTON_SIZES: Record<string, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
    "icon-sm": "h-7 w-7",
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    asChild?: boolean
    variant?: keyof typeof BUTTON_VARIANTS
    size?: keyof typeof BUTTON_SIZES
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={classNames(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
