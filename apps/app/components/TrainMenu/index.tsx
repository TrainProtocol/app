import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useEffect, useState } from "react";
import IconButton from "@/components/buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "@/context/formWizardProvider";
import { MenuStep } from "@/Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "@/components/Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import { NextRouter, useRouter } from "next/router";
import { resolvePersistantQueryParams } from "@/helpers/querryHelper";
import { Modal, ModalContent } from "@/components/Modal/modalWithoutAnimation";
import RpcNetworkListView from "@/components/Settings/RpcNetworkListView";
import NetworkRpcEditView from "@/components/Settings/NetworkRpcEditView";
import { Network } from "@/Models/Network";
import RecoverSwap from "@/components/Swap/Atomic/RecoverSwap";
import SwapHistory from "@/components/SwapHistory";

const Comp = () => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

    const goBackToMenuStep = () => { goToStep(MenuStep.Menu, "back"); clearMenuPath(router) }
    const goBackToRpcConfiguration = () => { goToStep(MenuStep.RPCConfiguration, "back") }

    const handleRecoverSwap = (sourceNetwork: string, txHash: string) => {
        setIsOpen(false)
        router.push({ pathname: '/swap', query: { sourceNetwork, txHash } })
    }

    const handleGoToStep = (step: MenuStep, path?: string) => {
        goToStep(step)
        if (path) {
            setMenuPath(path, router)
        }
    }

    const handleNetworkSelect = (network: Network) => {
        setSelectedNetwork(network)
        goToStep(MenuStep.NetworkRPCEdit)
    }

    const handleNetworkSave = () => {
        setSelectedNetwork(null)
        goToStep(MenuStep.RPCConfiguration, "back")
    }

    useEffect(() => {
        if (!isOpen) {
            goToStep(MenuStep.Menu)
            setSelectedNetwork(null)
            clearMenuPath(router)
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

//TODO: move URI handling to wizard provider
export const setMenuPath = (path: string, router: NextRouter) => {
    const basePath = router?.basePath || ""
    var finalURI = window.location.protocol + "//"
        + window.location.host + `${basePath}${path}`;
    const params = resolvePersistantQueryParams(router.query)
    if (params && Object.keys(params).length) {
        const search = new URLSearchParams(params as any);
        if (search)
            finalURI += `?${search}`
    }
    window.history.pushState({ ...window.history.state, as: router.asPath, url: finalURI }, '', finalURI);
}

export const clearMenuPath = (router: NextRouter) => {
    const basePath = router?.basePath || ""
    let finalURI = window.location.protocol + "//"
        + window.location.host + basePath + router.asPath;

    window.history.replaceState({ ...window.history.state, as: router.asPath, url: finalURI }, '', finalURI);
}

export default TrainMenu
