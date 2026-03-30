import { SidebarTrigger, useSidebarSafe } from "@/components/shadcn/sidebar"
import { WalletsHeader } from "@/components/Wallet/ConnectedWallets"

export default function NavbarActions() {
    const sidebar = useSidebarSafe()

    if (!sidebar) return null
    if (sidebar.open) return null

    return (
        <div className="flex items-center gap-x-2">
            <WalletsHeader variant="navbar" />
            <SidebarTrigger variant="navbar" />
        </div>
    )
}
