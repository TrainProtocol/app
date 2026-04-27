"use client"

import { FC, ReactNode, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, X } from "lucide-react"
import { useAppDialogueStore, type AppDialogueView } from "@/stores/appDialogueStore"
import useWallet from "@/hooks/useWallet"
import WalletsList from "@/components/Wallet/WalletsList"
import { LoginFlow, useLoginWizardState, loginStepTitle, wizardCanGoBack, type LoginWizard } from "@/components/SecretDerivation/LoginModal"
import { UserStatusContent } from "@/components/SecretDerivation/UserStatus"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import ConnectorsList from "@/components/WalletModal/ConnectorsList"
import { useConnectModal } from "@/components/WalletModal"
import IconButton from "@/components/buttons/iconButton"
import { Dialog, DialogContent, DialogTitle } from "@/components/shadcn/dialog"
import RecoverSwap from "@/components/Swap/Atomic/RecoverSwap"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"
import { buildSwapQuery } from "@/helpers/swapUrl"
import { useLoginModalStore } from "@/stores/loginModalStore"

const TITLES: Record<AppDialogueView, string> = {
    wallets: "Connected wallets",
    login: "Login to continue",
    userStatus: "Login status",
    connectWallet: "Connect wallet",
    recoverSwap: "Recover swap",
}

const AppDialogue: FC = () => {
    const view = useAppDialogueStore((s) => s.view)
    const stack = useAppDialogueStore((s) => s.stack)
    const back = useAppDialogueStore((s) => s.back)
    const closeStore = useAppDialogueStore((s) => s.close)

    const { selectedConnector, selectedMultiChainConnector, goBack: connectGoBack, cancel: cancelConnect, open: connectOpen } = useConnectModal()

    const loginWizard = useLoginWizardState()
    const loginStep = loginWizard.history[loginWizard.history.length - 1]
    const loginCanGoBack = wizardCanGoBack(loginWizard.history)

    const pathname = usePathname()
    const closeLogin = useLoginModalStore((s) => s.close)
    useEffect(() => {
        setVisuallyOpen(false)
        closeLogin()
        if (connectOpen) cancelConnect()
        // intentionally only react to pathname; the close handlers are stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname])

    const [visuallyOpen, setVisuallyOpen] = useState(false)
    useEffect(() => {
        setVisuallyOpen(view !== null)
    }, [view])

    const close = () => {
        if (stack.includes('connectWallet') && connectOpen) {
            cancelConnect()
        }
        setVisuallyOpen(false)
    }

    const handleAnimationEnd = () => {
        if (!visuallyOpen && view !== null) closeStore()
    }

    const handleBack = (v: AppDialogueView) => {
        if (v === 'login' && loginCanGoBack) {
            loginWizard.pop()
            return
        }
        if (v === 'connectWallet' && (selectedConnector || selectedMultiChainConnector)) {
            connectGoBack()
            return
        }
        if (v === 'connectWallet' && connectOpen) {
            cancelConnect()
        }
        back()
    }

    return (
        <Dialog open={visuallyOpen} onOpenChange={(open) => { if (!open) close() }}>
            <DialogContent
                showCloseButton={false}
                onAnimationEnd={handleAnimationEnd}
                className="p-0 gap-0 w-full sm:max-w-lg bg-secondary-700 border border-border rounded-3xl overflow-hidden flex flex-col has-expandContainerHeight:min-h-[675px] max-sm:has-openpicker:min-h-svh max-sm:min-h-[99.8svh] sm:has-openpicker:min-h-[79svh]! sm:min-h-[500px]"
            >
                <DialogTitle className="sr-only">{view ? TITLES[view] : 'Dialogue'}</DialogTitle>
                <div className="relative flex-1 flex flex-col">
                    <AnimatePresence>
                        {stack.map((v, i) => {
                            const isTop = i === stack.length - 1
                            return (
                                <motion.div
                                    key={`${v}-${i}`}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                    className="absolute inset-0 origin-center flex flex-col"
                                    style={{
                                        zIndex: i,
                                        pointerEvents: isTop ? 'auto' : 'none',
                                    }}
                                >
                                    <div className="relative h-full w-full bg-secondary-700 rounded-3xl flex flex-col overflow-hidden">
                                        <DialogueHeader
                                            view={v}
                                            canGoBack={
                                                i > 0
                                                || (v === 'connectWallet' && isTop && !!(selectedConnector || selectedMultiChainConnector))
                                                || (v === 'login' && isTop && loginCanGoBack)
                                            }
                                            onBack={() => handleBack(v)}
                                            onClose={close}
                                            titleOverride={
                                                v === 'login' && isTop
                                                    ? (loginStep === 'intro' ? '' : loginStepTitle(loginStep))
                                                    : undefined
                                            }
                                            connectSubtitle={
                                                v === 'connectWallet' && selectedMultiChainConnector && !selectedConnector
                                                    ? 'Select ecosystem'
                                                    : undefined
                                            }
                                        />
                                        <div className={`flex-1 overflow-y-auto styled-scroll px-4 pb-4 flex flex-col${v === 'connectWallet' ? ' openpicker' : ''}`}>
                                            {v === 'wallets' && <WalletsBody />}
                                            {v === 'login' && <LoginBody wizard={loginWizard} />}
                                            {v === 'userStatus' && <UserStatusBody />}
                                            {v === 'connectWallet' && <ConnectWalletBody />}
                                            {v === 'recoverSwap' && <RecoverSwapBody />}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    )
}

const DialogueHeader: FC<{
    view: AppDialogueView
    canGoBack: boolean
    onBack: () => void
    onClose: () => void
    connectSubtitle?: string
    titleOverride?: string
}> = ({ view, canGoBack, onBack, onClose, connectSubtitle, titleOverride }) => {
    const title = connectSubtitle ?? titleOverride ?? TITLES[view]
    return (
        <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            {canGoBack && (
                <div className="-ml-2">
                    <IconButton onClick={onBack} icon={<ChevronLeft strokeWidth={2} className="h-7 w-7" />} />
                </div>
            )}
            {title ? (
                <h2 className="text-primary-text text-base font-semibold flex-1 truncate">{title}</h2>
            ) : (
                <div className="flex-1" />
            )}
            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center justify-center w-10 h-10 shrink-0 text-secondary-text hover:bg-secondary-500 hover:text-primary-text rounded-lg transition-colors -mr-2"
            >
                <X className="w-7 h-7" strokeWidth={2} />
            </button>
        </div>
    )
}

const WalletsBody: FC = () => {
    const { wallets } = useWallet()
    return <WalletsList wallets={wallets} />
}

const LoginBody: FC<{ wizard: LoginWizard }> = ({ wizard }) => {
    const close = useAppDialogueStore((s) => s.close)
    return (
        <div className="-mx-4 flex-1 flex flex-col">
            <LoginFlow isOpen onClose={close} hideHeader wizard={wizard} />
        </div>
    )
}

const UserStatusBody: FC = () => {
    const close = useAppDialogueStore((s) => s.close)
    const secretDerivation = useOptionalSecretDerivation()
    if (!secretDerivation || !secretDerivation.isLoggedIn) return null
    const { method, loginWallet, logout } = secretDerivation
    return (
        <UserStatusContent
            method={method}
            loginWallet={loginWallet}
            logout={logout}
            onClose={close}
            showHeader={false}
            showPasskeyWarning={false}
        />
    )
}

const ConnectWalletBody: FC = () => {
    const back = useAppDialogueStore((s) => s.back)
    const { onFinish } = useConnectModal()
    return (
        <ConnectorsList
            onFinish={(wallet) => {
                onFinish(wallet)
                back()
            }}
        />
    )
}

const RecoverSwapBody: FC = () => {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleRecovered = (sourceNetwork: string, txHash: string) => {
        router.push(buildHrefWithPersistantParams('/swap', searchParams, buildSwapQuery(sourceNetwork, txHash)))
    }

    return <RecoverSwap onRecovered={handleRecovered} />
}

type StepBodyProps = {
    info: ReactNode
    actions: ReactNode
    gap?: string
    centerOverlay?: boolean
    centerNonOverlay?: boolean
    nonOverlayPt?: string
    overlayActionMt?: string
}

export const StepBody: FC<StepBodyProps> = ({
    info,
    actions,
    gap = "gap-5",
    centerOverlay = true,
    centerNonOverlay = true,
    nonOverlayPt = "pt-10",
    overlayActionMt = "",
}) => {
    const inDialogue = useAppDialogueStore((s) => s.view !== null)

    if (inDialogue) {
        const infoClasses = centerOverlay
            ? `flex-1 flex flex-col items-center justify-center ${gap} w-full`
            : `flex-1 flex flex-col ${gap}`
        return (
            <div className="flex flex-col min-h-full">
                <div className={infoClasses}>{info}</div>
                <div className={`w-full ${overlayActionMt}`.trim()}>{actions}</div>
            </div>
        )
    }

    if (centerNonOverlay) {
        return (
            <div className={`flex flex-col items-center justify-center ${gap} ${nonOverlayPt}`.trim()}>
                {info}
                {actions}
            </div>
        )
    }

    return (
        <div className={`flex flex-col ${gap}`}>
            {info}
            {actions}
        </div>
    )
}

export default AppDialogue
