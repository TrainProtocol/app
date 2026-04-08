import { FC, useCallback, useState } from "react"
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/shadcn/sidebar"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/shadcn/tabs"
import SwapHistory from "@/components/SwapHistory"
import RecoverSwap from "@/components/Swap/Atomic/RecoverSwap"
import AuthBlock from "@/components/AuthBlock"
import { UserStatusContent } from "@/components/SecretDerivation/UserStatus"
import { LoginSteps } from "@/components/SecretDerivation/LoginSteps"
import { usePasskeyLoginFlow } from "@/hooks/usePasskeyLoginFlow"
import { useSharedSecretDerivation } from "@train-protocol/react"
import { useLoginModalStore } from "@/stores/loginModalStore"
import { ChevronLeft } from "lucide-react"
import { useRouter } from "next/router"

type SidebarView = "tabs" | "loginStatus"

const AppSidebar: FC = () => {
    const [view, setView] = useState<SidebarView>("tabs")
    const router = useRouter()
    const { method, loginWallet, logout } = useSharedSecretDerivation()
    const loginActive = useLoginModalStore((s) => s.isOpen && s.target === 'sidebar')
    const { open: openLogin, close: closeLogin } = useLoginModalStore()

    const handleRecoverSwap = useCallback((hashlock: string) => {
        router.push({ pathname: '/swap', query: { hashlock } })
    }, [router])

    const dismissLogin = useCallback(() => {
        closeLogin()
        setView("tabs")
    }, [closeLogin])

    const loginFlow = usePasskeyLoginFlow({
        isActive: loginActive,
        onSuccess: dismissLogin,
        onDismiss: dismissLogin,
    })

    return (
        <Sidebar side="right" collapsible="offcanvas">
            {!loginActive && view === "tabs" && (
                <SidebarHeader className="px-4 pt-4">
                    <AuthBlock
                        onLogin={() => { setView("tabs"); openLogin('sidebar') }}
                        onViewLoginStatus={() => setView("loginStatus")}
                    />
                </SidebarHeader>
            )}
            {(view === "loginStatus" || loginActive) && (
                <div className="flex items-center gap-2 h-10 my-4 px-4 shrink-0">
                    <button
                        type="button"
                        onClick={loginActive ? loginFlow.handleBack : () => setView("tabs")}
                        aria-label="Go back"
                        className="inline-flex items-center justify-center w-10 h-10 shrink-0 active:animate-press-down text-secondary-text hover:bg-secondary-500 hover:text-primary-text focus:outline-hidden rounded-lg"
                    >
                        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
                    </button>
                    <h2 className="text-primary-text text-sm font-medium">
                        {loginActive
                            ? (loginFlow.currentStep === 'signing' ? 'Signing' : loginFlow.currentStep === 'unsupported' ? 'Browser not supported' : 'Login')
                            : 'Login Status'}
                    </h2>
                </div>
            )}

            <SidebarContent className="px-4 pb-4">
                {!loginActive && view === "tabs" && (
                    <Tabs defaultValue="transactions">
                        <TabsList variant="underline">
                            <TabsTrigger variant="underline" value="transactions">Transactions</TabsTrigger>
                            <TabsTrigger variant="underline" value="recover">Recover Swap</TabsTrigger>
                        </TabsList>
                        <TabsContent value="transactions" className="mt-3">
                            <SwapHistory />
                        </TabsContent>
                        <TabsContent value="recover" className="mt-3">
                            <RecoverSwap onRecovered={handleRecoverSwap} />
                        </TabsContent>
                    </Tabs>
                )}
                {!loginActive && view === "loginStatus" && (
                    <UserStatusContent
                        method={method}
                        loginWallet={loginWallet}
                        logout={logout}
                        onClose={() => setView("tabs")}
                    />
                )}
                {loginActive && (
                    <LoginSteps {...loginFlow} onDismiss={dismissLogin} />
                )}
            </SidebarContent>
        </Sidebar>
    )
}

export default AppSidebar
