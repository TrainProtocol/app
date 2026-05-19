"use client"

import { FC, ReactNode, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { motion, LayoutGroup } from "framer-motion"
import { ChevronLeft, ChevronRight, Circle, Globe, LucideIcon, Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { FormWizardProvider, useFormWizardaUpdate } from "@/context/formWizardProvider"
import { MenuStep } from "@/Models/Wizard"
import WizardItem from "@/components/Wizard/WizardItem"
import RpcNetworkListView from "@/components/Settings/RpcNetworkListView"
import NetworkRpcEditView from "@/components/Settings/NetworkRpcEditView"
import { useMenuNavigation } from "@/hooks/useMenuNavigation"
import SettingsCard from "./SettingsCard"
import MobilePageHeader from "@/components/MobilePageHeader"

const SettingsView: FC = () => {
    return (
        <>
            <MobilePageHeader />
            <FormWizardProvider noToolBar hideMenu initialStep={MenuStep.Menu}>
                <SettingsWizard />
            </FormWizardProvider>
        </>
    )
}

const SettingsWizard: FC = () => {
    const { setWrapperWidth, goToStep } = useFormWizardaUpdate()
    const wrapperRef = useRef<HTMLDivElement>(null)

    const {
        selectedNetwork,
        handleNetworkSelect,
        handleNetworkSave,
    } = useMenuNavigation()

    useEffect(() => {
        function handleResize() {
            if (wrapperRef.current) {
                setWrapperWidth(wrapperRef.current.offsetWidth)
            }
        }
        window.addEventListener("resize", handleResize)
        handleResize()
        return () => window.removeEventListener("resize", handleResize)
    }, [setWrapperWidth])

    return (
        <div id="widget" className="relative max-md:px-4">
            <div ref={wrapperRef}>
                <WizardItem StepName={MenuStep.Menu} inModal disableAnimation>
                    <MenuStepContent onOpenRpc={() => goToStep(MenuStep.RPCConfiguration)} />
                </WizardItem>
                <WizardItem
                    StepName={MenuStep.RPCConfiguration}
                    GoBack={() => goToStep(MenuStep.Menu, "back")}
                    inModal
                    disableAnimation
                >
                    <StepCard
                        title="RPC Configuration"
                        onBack={() => goToStep(MenuStep.Menu, "back")}
                    >
                        <RpcNetworkListView onNetworkSelect={handleNetworkSelect} />
                    </StepCard>
                </WizardItem>
                <WizardItem
                    StepName={MenuStep.NetworkRPCEdit}
                    GoBack={() => goToStep(MenuStep.RPCConfiguration, "back")}
                    inModal
                    disableAnimation
                >
                    <StepCard
                        title={selectedNetwork ? `${selectedNetwork.displayName} RPC` : "Network RPC"}
                        onBack={() => goToStep(MenuStep.RPCConfiguration, "back")}
                    >
                        {selectedNetwork ? (
                            <NetworkRpcEditView network={selectedNetwork} onSave={handleNetworkSave} />
                        ) : (
                            <div>Loading...</div>
                        )}
                    </StepCard>
                </WizardItem>
            </div>
        </div>
    )
}

const IconChip: FC<{ icon: LucideIcon }> = ({ icon: Icon }) => (
    <div className="flex shrink-0 items-center justify-center h-7 w-7 rounded-lg bg-secondary-500">
        <Icon className="h-3.5 w-3.5 text-secondary-text" strokeWidth={2} />
    </div>
)

const THEME_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "mist", label: "Mist", icon: Circle },
]

const ThemeSegmentedPicker: FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
    <LayoutGroup id="theme-segmented-picker">
        <div className="flex gap-1 p-1 rounded-[10px] bg-secondary-500">
            {THEME_OPTIONS.map(({ value: v, label, icon: Icon }) => {
                const active = value === v
                return (
                    <button
                        key={v}
                        type="button"
                        onClick={() => onChange(v)}
                        className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-md"
                    >
                        {active && (
                            <motion.div
                                layoutId="theme-segment-pill"
                                className="absolute inset-0 rounded-md bg-secondary-700 border border-border dark:border-transparent shadow-sm"
                                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                            />
                        )}
                        <Icon
                            className={cn(
                                "relative h-3.5 w-3.5 transition-colors",
                                active ? "text-primary-text" : "text-secondary-text"
                            )}
                            strokeWidth={2}
                        />
                        <span
                            className={cn(
                                "relative text-[11px] leading-none transition-colors",
                                active ? "text-primary-text font-semibold" : "text-secondary-text font-medium"
                            )}
                        >
                            {label}
                        </span>
                    </button>
                )
            })}
        </div>
    </LayoutGroup>
)

const MenuStepContent: FC<{ onOpenRpc: () => void }> = ({ onOpenRpc }) => {
    const { theme, setTheme } = useTheme()

    return (
        <div className="flex flex-col gap-3">
            <SettingsCard
                showTestnetBanner
                icon={<IconChip icon={Globe} />}
                iconAlign="center"
                title="RPC Configuration"
                description="Add or override RPC endpoints per network."
                action={<ChevronRight className="w-5 h-5 text-secondary-text" />}
                onClick={onOpenRpc}
            />

            <SettingsCard
                icon={<IconChip icon={Sun} />}
                iconAlign="center"
                title="Theme"
                description="Choose how the app looks. Select a theme or follow your system settings."
            >
                <ThemeSegmentedPicker value={theme ?? "light"} onChange={setTheme} />
            </SettingsCard>
        </div>
    )
}

const StepCard: FC<{ title: string; onBack: () => void; children: ReactNode }> = ({ title, onBack, children }) => {
    return (
        <SettingsCard
            showTestnetBanner
            header={
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Go back"
                        className="inline-flex items-center justify-center w-9 h-9 shrink-0 text-secondary-text hover:bg-secondary-500 hover:text-primary-text rounded-lg transition-colors -ml-2"
                    >
                        <ChevronLeft className="w-5 h-5" strokeWidth={2} />
                    </button>
                    <h2 className="text-primary-text text-base font-semibold">{title}</h2>
                </div>
            }
        >
            {children}
        </SettingsCard>
    )
}

export default SettingsView
