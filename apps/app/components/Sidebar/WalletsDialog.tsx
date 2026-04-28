"use client"

import { FC } from "react"
import AppShellDialog from "@/components/shared/AppShellDialog"
import WalletsList from "@/components/Wallet/WalletsList"
import useWallet from "@/hooks/useWallet"

interface WalletsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const WalletsDialog: FC<WalletsDialogProps> = ({ open, onOpenChange }) => {
    const { wallets } = useWallet()
    return (
        <AppShellDialog open={open} onOpenChange={onOpenChange} title="Connected wallets">
            <WalletsList wallets={wallets} layout="overlay" />
        </AppShellDialog>
    )
}

export default WalletsDialog
