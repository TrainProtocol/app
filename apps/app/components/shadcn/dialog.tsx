"use client"

import * as React from "react"
import { Dialog, DialogClose, DialogContent as BaseDialogContent, DialogDescription as BaseDialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle as BaseDialogTitle, DialogTrigger, } from "@layerswap/ui-kit"
import { cn } from "@layerswap/utils"
import { Button } from "@/components/shadcn/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof BaseDialogContent>) {
  return (
    <BaseDialogContent
      showCloseButton={false}
      className={cn("gap-6 rounded-4xl bg-popover p-6 text-popover-foreground shadow-xl ring-foreground/5 sm:max-w-md dark:ring-foreground/10", className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button variant="ghost" className="absolute top-4 right-4 bg-secondary" size="icon-sm">
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      )}
    </BaseDialogContent>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof BaseDialogTitle>) {
  return <BaseDialogTitle className={cn("font-heading font-medium", className)} {...props} />
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof BaseDialogDescription>) {
  return <BaseDialogDescription className={cn("text-muted-foreground *:[a]:hover:text-foreground", className)} {...props} />
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
