import { FC, useEffect, useRef } from "react"
import { Sidebar, SidebarContent } from "@/components/shadcn/sidebar"
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "@/context/formWizardProvider"
import { MenuStep } from "@/Models/Wizard"
import WizardItem from "@/components/Wizard/WizardItem"
import SidebarMenuList from "./SidebarMenuList"
import RpcNetworkListView from "@/components/Settings/RpcNetworkListView"
import NetworkRpcEditView from "@/components/Settings/NetworkRpcEditView"
import RecoverSwap from "@/components/Swap/Atomic/RecoverSwap"
import SwapHistory from "@/components/SwapHistory"
import { ChevronLeft } from "lucide-react"
import { AnimatePresence } from "framer-motion"
import { useMenuNavigation } from "@/hooks/useMenuNavigation"
import SendFeedback from "@/components/sendFeedback"

const AppSidebar: FC = () => {
    return (
        <Sidebar side="right" collapsible="offcanvas">
            <FormWizardProvider noToolBar hideMenu initialStep={MenuStep.Menu}>
                <SidebarInner />
            </FormWizardProvider>
        </Sidebar>
    )
}

const SidebarInner: FC = () => {
    const { goBack, currentStepName, moving, wrapperWidth } = useFormWizardState()
    const { setWrapperWidth } = useFormWizardaUpdate()
    const wrapperRef = useRef<HTMLDivElement>(null)

    const {
        selectedNetwork,
        goBackToMenuStep,
        goBackToRpcConfiguration,
        handleGoToStep,
        handleNetworkSelect,
        handleNetworkSave,
        handleRecoverSwap,
        handleViewSwap,
    } = useMenuNavigation()

    // Measure width for WizardItem animations
    useEffect(() => {
        function handleResize() {
            if (wrapperRef.current) {
                setWrapperWidth(wrapperRef.current.offsetWidth)
            }
        }
        window.addEventListener("resize", handleResize)
        handleResize()
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    return (
        <>
            {currentStepName !== MenuStep.Menu && (
                <div className="flex items-center gap-2 mt-5 px-4 pb-2 shrink-0">
                    <button
                        type="button"
                        onClick={goBack}
                        aria-label="Go back"
                        className="inline-flex items-center justify-center w-10 h-10 shrink-0 active:animate-press-down text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-hidden rounded-lg"
                    >
                        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                    </button>
                    <h2 className="text-primary-text text-sm font-medium">{currentStepName as string}</h2>
                </div>
            )}

            <SidebarContent className="px-4 pb-4 pt-4">
                <div ref={wrapperRef} className="h-full">
                    <AnimatePresence initial={false} custom={{ direction: moving === "forward" ? 1 : -1, width: wrapperWidth }}>
                        <WizardItem className="h-full" StepName={MenuStep.Menu} inModal>
                            <SidebarMenuList goToStep={handleGoToStep} onViewSwap={handleViewSwap} />
                        </WizardItem>
                        <WizardItem className="h-full" StepName={MenuStep.RPCConfiguration} GoBack={goBackToMenuStep} inModal>
                            <RpcNetworkListView onNetworkSelect={handleNetworkSelect} />
                        </WizardItem>
                        <WizardItem className="h-full" StepName={MenuStep.NetworkRPCEdit} GoBack={goBackToRpcConfiguration} inModal>
                            {selectedNetwork ? (
                                <NetworkRpcEditView
                                    network={selectedNetwork}
                                    onSave={handleNetworkSave}
                                />
                            ) : (
                                <div>Loading...</div>
                            )}
                        </WizardItem>
                        <WizardItem StepName={MenuStep.RecoverSwap} GoBack={goBackToMenuStep} inModal>
                            <RecoverSwap onRecovered={handleRecoverSwap} />
                        </WizardItem>
                        <WizardItem StepName={MenuStep.Transactions} GoBack={goBackToMenuStep} inModal>
                            <SwapHistory />
                        </WizardItem>
                        <WizardItem StepName={MenuStep.SuggestFeature} GoBack={goBackToMenuStep} inModal>
                            <SendFeedback onSend={goBackToMenuStep} />
                        </WizardItem>
                    </AnimatePresence>
                </div>
            </SidebarContent>
        </>
    )
}

export default AppSidebar
