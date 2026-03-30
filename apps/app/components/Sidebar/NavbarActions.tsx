import { useSidebarSafe } from "@/components/shadcn/sidebar"
import { WalletsHeader } from "@/components/Wallet/ConnectedWallets"
import { MenuIcon } from "lucide-react"

export default function NavbarActions() {
    const sidebar = useSidebarSafe()

    if (!sidebar) return null
    if (sidebar.open) return null

    return (
        <div className="flex items-center gap-x-2">
            <WalletsHeader variant="navbar" />
            <button
                type="button"
                onClick={sidebar.toggleSidebar}
                aria-label="Toggle sidebar"
                className="active:animate-press-down text-secondary-text bg-secondary-500 hover:bg-secondary-400 hover:text-primary-text focus:outline-hidden rounded-lg items-center inline-flex py-1.5"
            >
                <div className="mx-1.5">
                    <MenuIcon strokeWidth={2} />
                </div>
            </button>
        </div>
    )
}
