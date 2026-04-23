"use client"

import { FC, ReactNode, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, X } from "lucide-react"
import { useSettingsOverlayStore, type SettingsOverlayView } from "@/stores/settingsOverlayStore"
import useWallet from "@/hooks/useWallet"
import WalletsList from "@/components/Wallet/WalletsList"
import { LoginFlow } from "@/components/SecretDerivation/LoginModal"
import { UserStatusContent } from "@/components/SecretDerivation/UserStatus"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import ConnectorsList from "@/components/WalletModal/ConnectorsList"
import { useConnectModal } from "@/components/WalletModal"
import IconButton from "@/components/buttons/iconButton"
import { Dialog, DialogContent, DialogTitle } from "@/components/shadcn/dialog"

const TITLES: Record<SettingsOverlayView, string> = {
    wallets: "Connected wallets",
    login: "Login to continue",
    userStatus: "Login status",
    connectWallet: "Connect wallet",
}

const SettingsOverlay: FC = () => {
    const view = useSettingsOverlayStore((s) => s.view)
    const stack = useSettingsOverlayStore((s) => s.stack)
    const back = useSettingsOverlayStore((s) => s.back)
    const closeStore = useSettingsOverlayStore((s) => s.close)

    const { setRenderMode, selectedConnector, selectedMultiChainConnector, goBack: connectGoBack, cancel: cancelConnect, open: connectOpen } = useConnectModal()

    useEffect(() => {
        if (view === 'connectWallet') {
            setRenderMode('dialog')
            return () => setRenderMode('drawer')
        }
    }, [view, setRenderMode])

    const close = () => {
        if (stack.includes('connectWallet') && connectOpen) {
            cancelConnect()
        }
        closeStore()
    }

    const handleBack = (v: SettingsOverlayView) => {
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
        <Dialog open={view !== null} onOpenChange={(open) => { if (!open) close() }}>
            <DialogContent
                showCloseButton={false}
                className="p-0 gap-0 w-full sm:max-w-lg bg-secondary-700 border border-border rounded-3xl overflow-hidden flex flex-col has-expandContainerHeight:min-h-[675px] max-sm:has-openpicker:min-h-svh max-sm:min-h-[99.8svh] sm:has-openpicker:min-h-[79svh]! sm:min-h-[500px]"
            >
                <DialogTitle className="sr-only">{view ? TITLES[view] : 'Settings'}</DialogTitle>
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
                                        <OverlayHeader
                                            view={v}
                                            canGoBack={i > 0 || v === 'connectWallet'}
                                            onBack={() => handleBack(v)}
                                            onClose={close}
                                            connectSubtitle={
                                                v === 'connectWallet' && selectedMultiChainConnector && !selectedConnector
                                                    ? 'Select ecosystem'
                                                    : undefined
                                            }
                                        />
                                        <div className={`flex-1 overflow-y-auto styled-scroll px-4 pb-4 flex flex-col${v === 'connectWallet' ? ' openpicker' : ''}`}>
                                            <OverlayBody view={v} />
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

const OverlayHeader: FC<{
    view: SettingsOverlayView
    canGoBack: boolean
    onBack: () => void
    onClose: () => void
    connectSubtitle?: string
}> = ({ view, canGoBack, onBack, onClose, connectSubtitle }) => {
    const title = connectSubtitle ?? TITLES[view]
    return (
        <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            {canGoBack && (
                <div className="-ml-2">
                    <IconButton onClick={onBack} icon={<ChevronLeft strokeWidth={2} className="h-6 w-6" />} />
                </div>
            )}
            <h2 className="text-primary-text text-base font-semibold flex-1 truncate">{title}</h2>
            <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex items-center justify-center w-9 h-9 shrink-0 text-secondary-text hover:bg-secondary-500 hover:text-primary-text rounded-lg transition-colors -mr-2"
            >
                <X className="w-5 h-5" strokeWidth={2} />
            </button>
        </div>
    )
}

const OverlayBody: FC<{ view: SettingsOverlayView }> = ({ view }) => {
    if (view === 'wallets') return <WalletsOverlayBody />
    if (view === 'login') return <LoginOverlayBody />
    if (view === 'userStatus') return <UserStatusOverlayBody />
    if (view === 'connectWallet') return <ConnectWalletOverlayBody />
    return null
}

const WalletsOverlayBody: FC = () => {
    const { wallets } = useWallet()
    return <WalletsList wallets={wallets} />
}

const LoginOverlayBody: FC = () => {
    const close = useSettingsOverlayStore((s) => s.close)
    return (
        <div className="-mx-4 flex-1 flex flex-col">
            <LoginFlow isOpen onClose={close} hideHeader />
        </div>
    )
}

const UserStatusOverlayBody: FC = () => {
    const close = useSettingsOverlayStore((s) => s.close)
    const secretDerivation = useOptionalSecretDerivation()
    if (!secretDerivation) return null
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

const ConnectWalletOverlayBody: FC = () => {
    const back = useSettingsOverlayStore((s) => s.back)
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
    const inOverlay = useSettingsOverlayStore((s) => s.view !== null)

    if (inOverlay) {
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

export default SettingsOverlay
