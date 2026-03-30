import { useState, useCallback } from "react"
import { useFormWizardaUpdate } from "@/context/formWizardProvider"
import { MenuStep } from "@/Models/Wizard"
import { Network } from "@/Models/Network"
import { useRouter } from "next/router"
import { useSwapStore } from "@/stores/swapStore"

type UseMenuNavigationOptions = {
    onClose: () => void
}

export function useMenuNavigation({ onClose }: UseMenuNavigationOptions) {
    const { goToStep } = useFormWizardaUpdate()
    const router = useRouter()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)

    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)

    const goBackToMenuStep = useCallback(() => {
        goToStep(MenuStep.Menu, "back")
    }, [goToStep])

    const goBackToRpcConfiguration = useCallback(() => {
        goToStep(MenuStep.RPCConfiguration, "back")
    }, [goToStep])

    const handleGoToStep = useCallback((step: MenuStep) => {
        goToStep(step)
    }, [goToStep])

    const handleNetworkSelect = useCallback((network: Network) => {
        setSelectedNetwork(network)
        goToStep(MenuStep.NetworkRPCEdit)
    }, [goToStep])

    const handleNetworkSave = useCallback(() => {
        setSelectedNetwork(null)
        goToStep(MenuStep.RPCConfiguration, "back")
    }, [goToStep])

    const handleRecoverSwap = useCallback((hashlock: string) => {
        onClose()
        router.push({ pathname: '/swap', query: { hashlock } })
    }, [onClose, router])

    const handleViewSwap = useCallback((hashlock: string) => {
        onClose()
        if (router.pathname === '/') {
            setActiveHashlock(hashlock)
            setSwapModalOpen(true)
        } else {
            router.push({ pathname: '/swap', query: { hashlock } })
        }
    }, [onClose, router, setActiveHashlock, setSwapModalOpen])

    return {
        selectedNetwork,
        setSelectedNetwork,
        goBackToMenuStep,
        goBackToRpcConfiguration,
        handleGoToStep,
        handleNetworkSelect,
        handleNetworkSave,
        handleRecoverSwap,
        handleViewSwap,
    }
}
