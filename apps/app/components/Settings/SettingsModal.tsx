import { Dispatch, FC, ReactNode, SetStateAction, useEffect, useRef, useState } from "react"
import VaulDrawer from "@/components/Modal/vaulModal"
import { FormWizardProvider, useFormWizardaUpdate, useFormWizardState } from "@/context/formWizardProvider"
import { MenuStep } from "@/Models/Wizard"
import WizardItem from "@/components/Wizard/WizardItem"
import RpcNetworkListView from "@/components/Settings/RpcNetworkListView"
import NetworkRpcEditView from "@/components/Settings/NetworkRpcEditView"
import { useMenuNavigation } from "@/hooks/useMenuNavigation"
import { useSwapPreferencesStore } from "@/stores/swapPreferencesStore"
import { useTheme } from "next-themes"
import { ChevronLeft, Settings2, Zap, Sun } from "lucide-react"
import Menu from "@/components/TrainMenu/Menu"

const SettingsModal: FC<{ show: boolean; setShow: (open: boolean) => void }> = ({ show, setShow }) => {
    const [headerContent, setHeaderContent] = useState<ReactNode>("Settings")

    return (
        <VaulDrawer
            show={show}
            setShow={setShow}
            header={headerContent}
            modalId="settingsModal"
            mode="fitHeight"
        >
            <VaulDrawer.Snap id="item-1" className="pb-0">
                <FormWizardProvider noToolBar hideMenu initialStep={MenuStep.Menu}>
                    <SettingsModalInner setHeaderContent={setHeaderContent} />
                </FormWizardProvider>
            </VaulDrawer.Snap>
        </VaulDrawer>
    )
}

const SettingsModalInner: FC<{ setHeaderContent: Dispatch<SetStateAction<ReactNode>> }> = ({ setHeaderContent }) => {
    const { goBack, currentStepName } = useFormWizardState()
    const { setWrapperWidth, goToStep } = useFormWizardaUpdate()
    const wrapperRef = useRef<HTMLDivElement>(null)

    const {
        selectedNetwork,
        handleNetworkSelect,
        handleNetworkSave,
    } = useMenuNavigation()

    const { autoRevealSecret, setAutoRevealSecret } = useSwapPreferencesStore()
    const { theme, setTheme } = useTheme()

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

    useEffect(() => {
        return () => {
            goToStep(MenuStep.Menu)
        }
    }, [])

    useEffect(() => {
        if (currentStepName === MenuStep.Menu) {
            setHeaderContent("Settings")
        } else {
            setHeaderContent(
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={goBack}
                        aria-label="Go back"
                        className="inline-flex items-center justify-center w-10 h-10 shrink-0 active:animate-press-down text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-hidden rounded-lg"
                    >
                        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                    </button>
                    <span className="text-primary-text text-sm font-medium">{currentStepName as string}</span>
                </div>
            )
        }
    }, [currentStepName, goBack])

    return (
        <div className="flex flex-col">
            <div ref={wrapperRef}>
                <WizardItem StepName={MenuStep.Menu} inModal disableAnimation>
                    <Menu>
                        <Menu.Group>
                            <Menu.ToggleItem
                                icon={<Zap className="h-5 w-5" />}
                                checked={autoRevealSecret}
                                onChange={setAutoRevealSecret}
                            >
                                Auto Reveal Secret
                            </Menu.ToggleItem>
                            <Menu.ToggleItem
                                icon={<Sun className="h-5 w-5" />}
                                checked={theme === "light"}
                                onChange={(checked) => setTheme(checked ? "light" : "default")}
                            >
                                Light Mode
                            </Menu.ToggleItem>
                            <Menu.Item onClick={() => goToStep(MenuStep.RPCConfiguration)} icon={<Settings2 className="h-5 w-5" />}>
                                RPC Configuration
                            </Menu.Item>
                        </Menu.Group>
                    </Menu>
                </WizardItem>
                <WizardItem StepName={MenuStep.RPCConfiguration} GoBack={() => goToStep(MenuStep.Menu, "back")} inModal disableAnimation>
                    <RpcNetworkListView onNetworkSelect={handleNetworkSelect} />
                </WizardItem>
                <WizardItem StepName={MenuStep.NetworkRPCEdit} GoBack={() => goToStep(MenuStep.RPCConfiguration, "back")} inModal disableAnimation>
                    {selectedNetwork ? (
                        <NetworkRpcEditView
                            network={selectedNetwork}
                            onSave={handleNetworkSave}
                        />
                    ) : (
                        <div>Loading...</div>
                    )}
                </WizardItem>
            </div>
        </div>
    )
}

export default SettingsModal
