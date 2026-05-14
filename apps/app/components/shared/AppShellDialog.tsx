"use client"

import { FC, ReactNode } from "react"
import { ChevronLeft, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/shadcn/dialog"
import IconButton from "@/components/buttons/iconButton"
import clsx from "clsx"

interface AppShellDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    onBack?: () => void;
    mode?: "default" | "fit-content"
    contentClassName?: string
    children: ReactNode
}

const AppShellDialog: FC<AppShellDialogProps> = ({ open, onOpenChange, title, onBack, children, mode = 'default', contentClassName }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className={clsx(
                    "p-0 gap-0 w-full sm:max-w-lg bg-secondary-700 border border-border rounded-4xl overflow-hidden",
                    contentClassName,
                    { "sm:min-h-120": mode !== 'fit-content' }
                )}
            >
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <div className="relative h-full w-full bg-secondary-700 rounded-4xl flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 p-4 pb-2">
                        {onBack && (
                            <div className="-ml-2">
                                <IconButton onClick={onBack} icon={<ChevronLeft strokeWidth={2} className="h-7 w-7" />} />
                            </div>
                        )}
                        {title ? (
                            <h2 className="text-primary-text text-base font-semibold flex-1 truncate">{title}</h2>
                        ) : (
                            <div className="flex-1" />
                        )}
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            aria-label="Close"
                            className="inline-flex items-center justify-center w-10 h-10 shrink-0 text-secondary-text hover:bg-secondary-500 hover:text-primary-text rounded-lg transition-colors"
                        >
                            <X className="w-7 h-7" strokeWidth={2} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto styled-scroll px-4 pb-4 flex flex-col h-full">
                        {children}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default AppShellDialog
