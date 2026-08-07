import { useState, useCallback, startTransition } from "react"
import { useFormWizardaUpdate } from "@/context/formWizardProvider"
import { MenuStep } from "@/Models/Wizard"
import { ExtendedNetwork } from "@/Models/Network"
import { useRouter, useSearchParams } from "next/navigation"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"
import { buildSwapQuery } from "@/helpers/swapUrl"
import { captureEvent } from "@/lib/faro"

export function useMenuNavigation() {
    const { goToStep } = useFormWizardaUpdate()
    const router = useRouter()
    const searchParams = useSearchParams()

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
        captureEvent("rpc_override_saved", { network: selectedNetwork?.caip2Id })
        setSelectedNetwork(null)
        goToStep(MenuStep.RPCConfiguration, "back")
    }, [goToStep, selectedNetwork?.caip2Id])

    const handleRecoverSwap = useCallback((sourceNetwork: string, txHash: string) => {
        const href = buildHrefWithPersistantParams('/swap', searchParams, buildSwapQuery(sourceNetwork, txHash))
        startTransition(() => router.push(href))
    }, [router, searchParams])

    return {
        selectedNetwork,
        setSelectedNetwork,
        goBackToMenuStep,
        goBackToRpcConfiguration,
        handleGoToStep,
        handleNetworkSelect,
        handleNetworkSave,
        handleRecoverSwap,
    }
}
