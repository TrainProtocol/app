import { useSidebarSafe } from "@/components/shadcn/sidebar"
import PendingSwap from "@/components/Swap/PendingSwap"
import { useSwapStore } from "@/stores/swapStore"
import { MenuIcon } from "lucide-react"

export default function NavbarActions() {
    const sidebar = useSidebarSafe()
    const hasActiveSwap = useSwapStore(s => !!s.activeHashlock)

    if (!sidebar) return null
    if (sidebar.open) return null

    return (
        <div className="flex items-center gap-x-2">
            {sidebar.isMobile && <PendingSwap />}
            <button
                type="button"
                onClick={sidebar.toggleSidebar}
                aria-label="Toggle sidebar"
                className="relative active:animate-press-down text-secondary-text bg-secondary-500 hover:bg-secondary-400 hover:text-primary-text focus:outline-hidden rounded-lg items-center inline-flex py-1.5"
            >
                <div className="mx-1.5">
                    <MenuIcon strokeWidth={2} />
                </div>
                {!sidebar.isMobile && hasActiveSwap && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary-500 rounded-full ring-2 ring-secondary-500" />
                )}
            </button>
        </div>
    )
}
