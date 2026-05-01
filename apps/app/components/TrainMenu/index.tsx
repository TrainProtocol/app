"use client"

import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useEffect, useState } from "react";
import IconButton from "@/components/buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "@/context/formWizardProvider";
import { MenuStep } from "@/Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "@/components/Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import { usePathname, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { buildHrefWithPersistantParams, silentReplaceState } from "@/helpers/querryHelper";
import { Modal, ModalContent } from "@/components/Modal/modalWithoutAnimation";
import RpcNetworkListView from "@/components/Settings/RpcNetworkListView";
import NetworkRpcEditView from "@/components/Settings/NetworkRpcEditView";
import RecoverSwap from "@/components/Swap/Atomic/RecoverSwap";
import SwapHistory from "@/components/SwapHistory";
import { useMenuNavigation } from "@/hooks/useMenuNavigation";

//TODO: move URI handling to wizard provider
export const setMenuPath = (path: string, searchParams: ReadonlyURLSearchParams | null) => {
    window.history.pushState(null, "", buildHrefWithPersistantParams(path, searchParams))
}

export const clearMenuPath = (pathname: string | null, searchParams: ReadonlyURLSearchParams | null) => {
    silentReplaceState(buildHrefWithPersistantParams(pathname ?? "/", searchParams))
}

const Comp = () => {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const {
        selectedNetwork,
        setSelectedNetwork,
        goBackToRpcConfiguration,
        handleNetworkSelect,
        handleNetworkSave,
        handleRecoverSwap,
        goBackToMenuStep
    } = useMenuNavigation()

    // Wrap to add URL history push
    const handleGoToStep = (step: MenuStep, path?: string) => {
        goToStep(step)
        if (path) {
            setMenuPath(path, searchParams)
        }
    }

    useEffect(() => {
        if (!isOpen) {
            goToStep(MenuStep.Menu)
            setSelectedNetwork(null)
            clearMenuPath(pathname, searchParams)
        }
    }, [isOpen])

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            <IconButton className="inline-flex active:animate-press-down" onClick={() => setIsOpen(true)} icon={
                <MenuIcon strokeWidth="2" />
            } />
            <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
                <ModalContent
                    className="pb-4"
                    header={
                        <div className="inline-flex items-center w-full">
                            {
                                goBack &&
                                <div className="-ml-2">
                                    <IconButton className="inline-flex" onClick={goBack} icon={
                                        <ChevronLeft strokeWidth="2" />
                                    } />
                                </div>
                            }
                            <h2 className="flex-1">{currentStepName as string}</h2>
                        </div>
                    }
                >
                    {() => (
                        <div className="h-full openpicker" id="virtualListContainer">
                            <Wizard wizardId='menuWizard' className="pb-4">
                                <WizardItem StepName={MenuStep.Menu} inModal>
                                    <MenuList goToStep={handleGoToStep} />
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
                            </Wizard>
                        </div>
                    )}
                </ModalContent>
            </Modal>
        </div >
    </>
}

const TrainMenu: FC = () => {
    return (
        <FormWizardProvider noToolBar hideMenu initialStep={MenuStep.Menu}>
            <Comp />
        </FormWizardProvider>
    )
}

export default TrainMenu
