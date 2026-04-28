"use client"

import PendingSwap from "./Swap/PendingSwap"
import { WalletsHeader } from "./Wallet/ConnectedWallets"

export default function Navbar() {
    return (
        <div className="hidden md:flex w-full items-center justify-end gap-x-2 px-8 py-5">
            <PendingSwap />
            <WalletsHeader />
        </div>
    )
}
