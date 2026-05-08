"use client"

import PendingSwap from "./Swap/PendingSwap"
import { WalletsHeader } from "./Wallet/ConnectedWallets"
import { SidebarTrigger } from "./shadcn/sidebar"

export default function Navbar() {
    return (
        <div className="hidden md:flex w-full items-start gap-x-2 pl-2 pr-8 py-5">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-x-2">
                <PendingSwap />
                <WalletsHeader />
            </div>
        </div>
    )
}
