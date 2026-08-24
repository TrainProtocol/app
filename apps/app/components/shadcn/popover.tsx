"use client"

import * as React from "react"
import { Popover, PopoverAnchor, PopoverContent as BasePopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger, } from "@layerswap/ui-kit"
import { cn } from "@layerswap/utils"

function PopoverContent({ className, ...props }: React.ComponentProps<typeof BasePopoverContent>) {
  return (
    <BasePopoverContent
      container={null}
      className={cn("flex w-72 max-w-none flex-col gap-4 rounded-4xl bg-popover p-4 text-popover-foreground shadow-lg ring-foreground/5 dark:ring-foreground/10", className)}
      {...props}
    />
  )
}

export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
}
