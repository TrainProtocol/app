"use client"

import { FC } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import AppShellDialog from "@/components/shared/AppShellDialog"
import RecoverSwap from "@/components/Swap/Atomic/RecoverSwap"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"
import { buildSwapQuery } from "@/helpers/swapUrl"

interface RecoverSwapDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const RecoverSwapDialog: FC<RecoverSwapDialogProps> = ({ open, onOpenChange }) => {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleRecovered = (sourceNetwork: string, txHash: string) => {
        onOpenChange(false)
        router.push(buildHrefWithPersistantParams('/swap', searchParams, buildSwapQuery(sourceNetwork, txHash)))
    }

    return (
        <AppShellDialog open={open} onOpenChange={onOpenChange} title="Recover swap" mode="fit-content">
            <RecoverSwap onRecovered={handleRecovered} />
        </AppShellDialog>
    )
}

export default RecoverSwapDialog
