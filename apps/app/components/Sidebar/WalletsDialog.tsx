"use client"

import { FC } from "react"
import AppShellDialog from "@/components/shared/AppShellDialog"
import VaulDrawer from "@/components/Modal/vaulModal"
import WalletsList from "@/components/Wallet/WalletsList"
import useWallet from "@/hooks/useWallet"
import useWindowDimensions from "@/hooks/useWindowDimensions"

interface WalletsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const WalletsDialog: FC<WalletsDialogProps> = ({ open, onOpenChange }) => {
    const { wallets } = useWallet()
    const { isMobile } = useWindowDimensions()

    if (isMobile) {
        return (
            <VaulDrawer
                show={open}
                setShow={(show) => { if (!show) onOpenChange(false) }}
                header="Connected wallets"
                modalId="connected-wallets"
                mode="fitHeight"
            >
                <VaulDrawer.Snap id="item-1" className="pb-0">
                    <WalletsList wallets={wallets} layout="overlay" />
                </VaulDrawer.Snap>
            </VaulDrawer>
        )
    }

    return (
        <AppShellDialog open={open} onOpenChange={onOpenChange} title="Connected wallets">
            <WalletsList wallets={wallets} layout="overlay" />
        </AppShellDialog>
    )
}

export default WalletsDialog
