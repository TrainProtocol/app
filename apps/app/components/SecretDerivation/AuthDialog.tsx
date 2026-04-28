"use client"

import { FC, ReactNode, useEffect } from "react"
import { ChevronLeft } from "lucide-react"
import { usePathname } from "next/navigation"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import AppShellDialog from "@/components/shared/AppShellDialog"
import VaulDrawer from "@/components/Modal/vaulModal"
import IconButton from "@/components/buttons/iconButton"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { useAuthDialog } from "@/stores/authDialogStore"
import { LoginFlow, useLoginWizardState, loginStepTitle, wizardCanGoBack } from "./LoginModal"
import { UserStatusContent } from "./UserStatus"

const AuthDialog: FC = () => {
    const open = useAuthDialog((s) => s.open)
    const close = useAuthDialog((s) => s.close)
    const secretDerivation = useOptionalSecretDerivation()
    const { isMobile } = useWindowDimensions()

    const wizard = useLoginWizardState()
    const step = wizard.history[wizard.history.length - 1]
    const canGoBack = wizardCanGoBack(wizard.history)

    const pathname = usePathname()
    useEffect(() => { close() }, [pathname, close])

    if (!secretDerivation) return null

    const { isLoggedIn, method, loginWallet, logout } = secretDerivation
    const loginTitle = step === 'intro' ? '' : loginStepTitle(step)
    const title = isLoggedIn ? "Login status" : loginTitle
    const onBack = !isLoggedIn && canGoBack ? wizard.pop : undefined

    const body: ReactNode = isLoggedIn ? (
        <UserStatusContent
            method={method}
            loginWallet={loginWallet}
            logout={logout}
            onClose={close}
            showHeader={false}
            showPasskeyWarning={false}
        />
    ) : (
        <div className="-mx-4 flex-1 flex flex-col h-full">
            <LoginFlow isOpen onClose={close} hideHeader wizard={wizard} />
        </div>
    )

    if (isMobile) {
        return (
            <VaulDrawer
                show={open}
                setShow={(show) => { if (!show) close() }}
                modalId="auth-dialog"
                mode="fitHeight"
                header={
                    <div className="flex items-center gap-1">
                        {onBack && (
                            <div className="-ml-2">
                                <IconButton onClick={onBack} icon={<ChevronLeft className="h-6 w-6" />} />
                            </div>
                        )}
                        <p>{title}</p>
                    </div>
                }
            >
                <VaulDrawer.Snap id="item-1" openFullHeight className="h-full">
                    {body}
                </VaulDrawer.Snap>
            </VaulDrawer>
        )
    }

    return (
        <AppShellDialog
            open={open}
            onOpenChange={(o) => { if (!o) close() }}
            title={title}
            onBack={onBack}
        >
            {body}
        </AppShellDialog>
    )
}

export default AuthDialog
