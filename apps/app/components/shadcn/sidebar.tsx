import { createContext, useContext, useCallback, useState, useMemo, useEffect, FC, ReactNode } from "react"
import { MenuIcon, ChevronsRight } from "lucide-react"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { classNames } from "@/components/utils/classNames"

const SIDEBAR_WIDTH = 400

// --- Context ---

type SidebarContextType = {
    open: boolean
    setOpen: (open: boolean) => void
    toggleSidebar: () => void
    isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | null>(null)

export function useSidebar() {
    const ctx = useContext(SidebarContext)
    if (!ctx) throw new Error("useSidebar must be used within SidebarProvider")
    return ctx
}

export function useSidebarSafe() {
    return useContext(SidebarContext)
}

// --- Provider ---

type SidebarProviderProps = {
    children: ReactNode
    defaultOpen?: boolean
}

export const SidebarProvider: FC<SidebarProviderProps> = ({ children, defaultOpen = false }) => {
    const { isMobile } = useWindowDimensions()
    const [open, setOpen] = useState(defaultOpen)

    const toggleSidebar = useCallback(() => setOpen(prev => !prev), [])

    // Close sidebar when switching to mobile
    useEffect(() => {
        if (isMobile && open) setOpen(false)
    }, [isMobile])

    const value = useMemo(
        () => ({ open, setOpen, toggleSidebar, isMobile }),
        [open, setOpen, toggleSidebar, isMobile]
    )

    return (
        <SidebarContext.Provider value={value}>
            {children}
        </SidebarContext.Provider>
    )
}

// --- Sidebar Panel ---

type SidebarProps = {
    children: ReactNode
    className?: string
}

export const Sidebar: FC<SidebarProps> = ({ children, className }) => {
    const { open, isMobile, toggleSidebar } = useSidebar()

    if (isMobile) return null

    return (
        <aside
            className={classNames(
                "relative shrink-0 h-screen transition-[width] duration-300 ease-in-out z-50",
                open ? "overflow-visible" : "overflow-hidden",
                className
            )}
            style={{ width: open ? SIDEBAR_WIDTH : 0 }}
        >
            <div
                className="sticky top-0 h-screen text-primary-text"
                style={{ width: SIDEBAR_WIDTH }}
            >
                {/* Close button — absolute, sticks out left */}
                <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label="Close sidebar"
                    className="absolute top-6 -left-8 -z-10 flex items-center justify-center w-10 h-10 rounded-l-xl bg-secondary-500 hover:bg-secondary-400 text-secondary-text hover:text-primary-text transition-colors cursor-pointer"
                >
                    <ChevronsRight className="h-6 w-6" strokeWidth={2} />
                </button>

                <div className="w-full h-full bg-secondary-700 border-l border-secondary-500 flex flex-col overflow-hidden">
                    {children}
                </div>
            </div>
        </aside>
    )
}

// --- Trigger ---

type SidebarTriggerProps = {
    className?: string
    variant?: "mobile" | "navbar"
}

export const SidebarTrigger: FC<SidebarTriggerProps> = ({ className, variant = "mobile" }) => {
    const { toggleSidebar, isMobile } = useSidebar()

    if (isMobile) return null

    const baseClassName = variant === "navbar"
        ? "active:animate-press-down text-secondary-text bg-secondary-500 hover:bg-secondary-400 hover:text-primary-text focus:outline-hidden rounded-lg items-center inline-flex py-1.5"
        : "active:animate-press-down text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-hidden rounded-lg items-center inline-flex py-1.5"

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            className={classNames(baseClassName, className)}
        >
            <div className="mx-1.5">
                <MenuIcon strokeWidth={2} />
            </div>
        </button>
    )
}

// --- Content (scrollable area) ---

export const SidebarContent: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
    return (
        <div className={classNames("flex-1 overflow-y-auto styled-scroll", className)}>
            {children}
        </div>
    )
}

// --- Header ---

export const SidebarHeader: FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
    return (
        <div className={classNames("shrink-0", className)}>
            {children}
        </div>
    )
}
