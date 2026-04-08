import { useState, useCallback } from "react"
import { useFormWizardaUpdate } from "@/context/formWizardProvider"
import { MenuStep } from "@/Models/Wizard"
import { ExtendedNetwork } from "@/Models/Network"
import { useRouter } from "next/router"
import { useSwapStore } from "@/stores/swapStore"

export function useMenuNavigation() {
    const { goToStep } = useFormWizardaUpdate()
    const router = useRouter()
    const setActiveHashlock = useSwapStore(s => s.setActiveHashlock)
    const setSwapModalOpen = useSwapStore(s => s.setSwapModalOpen)

    const [selectedNetwork, setSelectedNetwork] = useState<ExtendedNetwork | null>(null)

    const goBackToMenuStep = useCallback(() => {
        goToStep(MenuStep.Menu, "back")
    }, [goToStep])

    const goBackToRpcConfiguration = useCallback(() => {
        goToStep(MenuStep.RPCConfiguration, "back")
    }, [goToStep])

    const handleGoToStep = useCallback((step: MenuStep) => {
        goToStep(step)
    }, [goToStep])

    const handleNetworkSelect = useCallback((network: ExtendedNetwork) => {
        setSelectedNetwork(network)
        goToStep(MenuStep.NetworkRPCEdit)
    }, [goToStep])

    const handleNetworkSave = useCallback(() => {
        setSelectedNetwork(null)
        goToStep(MenuStep.RPCConfiguration, "back")
    }, [goToStep])

    const handleRecoverSwap = useCallback((hashlock: string) => {
        router.push({ pathname: '/swap', query: { hashlock } })
    }, [router])

    const handleViewSwap = useCallback((hashlock: string) => {
        if (router.pathname === '/') {
            setActiveHashlock(hashlock)
            setSwapModalOpen(true)
        } else {
            router.push({ pathname: '/swap', query: { hashlock } })
        }
    }, [router, setActiveHashlock, setSwapModalOpen])

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
