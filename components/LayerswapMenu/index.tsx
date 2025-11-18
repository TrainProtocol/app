import { MenuIcon, ChevronLeft } from "lucide-react";
import { FC, useState } from "react";
import IconButton from "../buttons/iconButton";
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "../../context/formWizardProvider";
import { MenuStep } from "../../Models/Wizard";
import MenuList from "./MenuList";
import Wizard from "../Wizard/Wizard";
import WizardItem from "../Wizard/WizardItem";
import { NextRouter, useRouter } from "next/router";
import { resolvePersistantQueryParams } from "../../helpers/querryHelper";
import Modal from "../Modal/modal";
import RpcNetworkListView from "../Settings/RpcNetworkListView";
import NetworkRpcEditView from "../Settings/NetworkRpcEditView";
import { Network } from "../../Models/Network";
import clsx from "clsx";

const Comp = () => {
    const router = useRouter();

    const { goBack, currentStepName } = useFormWizardState()
    const { goToStep } = useFormWizardaUpdate()

    const [openTopModal, setOpenTopModal] = useState(false);
    const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);

    const handleModalOpenStateChange = (value: boolean) => {
        setOpenTopModal(value)
        if (value === false) {
            goToStep(MenuStep.Menu)
            setSelectedNetwork(null)
        }
    }

    const goBackToMenuStep = () => { goToStep(MenuStep.Menu, "back"); clearMenuPath(router) }
    const goBackToRpcConfiguration = () => { goToStep(MenuStep.RPCConfiguration, "back") }

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

    return <>
        <div className="text-secondary-text cursor-pointer relative">
            <IconButton onClick={() => setOpenTopModal(true)} icon={
                <MenuIcon strokeWidth="2" />
            }>
            </IconButton>
            <Modal
                modalId="menuModal"
                show={openTopModal}
                setShow={handleModalOpenStateChange}
                header={
                    <div className="inline-flex items-center">
                        {
                            goBack &&
                            <div className="-ml-2">
                                <IconButton onClick={goBack} icon={
                                    <ChevronLeft strokeWidth="2" />
                                }>
                                </IconButton>
                            </div>
                        }
                        <h2>{currentStepName as string}</h2>
                    </div>
                }
            >
                <Wizard wizardId='menuWizard'
                    className={clsx("h-full", {
                        '!pb-0': currentStepName !== MenuStep.Menu
                    })}
                >
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
                    {/* <WizardItem StepName={MenuStep.Transactions} GoBack={goBackToMenuStep} className="h-full" inModal>
                        <HistoryList onNewTransferClick={() => handleModalOpenStateChange(false)} />
                    </WizardItem> */}
                </Wizard>
            </Modal>
        </div >
    </>
}

const LayerswapMenu: FC = () => {
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

export default LayerswapMenu
