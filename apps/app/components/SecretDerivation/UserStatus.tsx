import { FC, useState } from "react"
import { Fingerprint, Lock, LogOut } from "lucide-react"
import VaulDrawer from "../Modal/vaulModal"
import { useSharedSecretDerivation, useOptionalSecretDerivation } from "@train-protocol/react"
import { formatPasskeyIdForDisplay } from "@train-protocol/auth"
import { useAuthDialog } from "@/hooks/useAuthDialog"
import { Address } from "@/lib/address"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import WalletIcon from "../Icons/WalletIcon"
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover"
import { StepBody } from "@/components/AppDialogue/AppDialogue"

export interface LoginWallet {
    address: string
    providerName: string
    displayName?: string
}

export type LoginIdentityIcon = FC<{ className?: string; strokeWidth?: string | number }>

export const getLoginIdentity = (
    method: 'passkey' | 'wallet_sign' | null,
    loginWallet: LoginWallet | null,
    passkeyLabel: string | null,
    activePasskeyCredentialId: string | null,
) => {
    const isPasskey = method === 'passkey'
    const Icon: LoginIdentityIcon = isPasskey ? Fingerprint : WalletIcon
    const label = isPasskey
        ? passkeyLabel
        : (loginWallet?.displayName ?? null)
    const idShort = isPasskey
        ? (activePasskeyCredentialId ? formatPasskeyIdForDisplay(activePasskeyCredentialId) : null)
        : (loginWallet?.address ? new Address(loginWallet.address, null, loginWallet.providerName).toShortString() : null)
    return { isPasskey, label, idShort, Icon }
}

export const copyWalletAddress = (loginWallet: LoginWallet | null) => {
    if (loginWallet?.address) navigator.clipboard.writeText(loginWallet.address)
}

interface LoginDataCardProps {
    method: 'passkey' | 'wallet_sign' | null
    loginWallet: LoginWallet | null
    passkeyLabel: string | null
    activePasskeyCredentialId: string | null
    onCopyAddress: () => void
    className?: string
}

export const LoginDataCard = ({
    method,
    loginWallet,
    passkeyLabel,
    activePasskeyCredentialId,
    onCopyAddress,
    className = "flex items-center gap-3 p-3 bg-secondary-500 rounded-xl",
}: LoginDataCardProps) => {
    const { isMobile } = useWindowDimensions()
    const idShort = activePasskeyCredentialId ? formatPasskeyIdForDisplay(activePasskeyCredentialId) : null
    const idTriggerSpan = (
        <span className="text-secondary-text text-sm truncate cursor-default">{idShort}</span>
    )
    const idReveal = idShort && activePasskeyCredentialId && (
        isMobile ? (
            <Popover>
                <PopoverTrigger asChild>{idTriggerSpan}</PopoverTrigger>
                <PopoverContent side="top" className="w-auto p-2 bg-secondary-500! rounded-lg!">
                    <p className="font-mono break-all max-w-[280px] text-xs text-primary-text">{activePasskeyCredentialId}</p>
                </PopoverContent>
            </Popover>
        ) : (
            <Tooltip>
                <TooltipTrigger asChild>{idTriggerSpan}</TooltipTrigger>
                <TooltipContent>
                    <p className="font-mono break-all max-w-[280px]">{activePasskeyCredentialId}</p>
                </TooltipContent>
            </Tooltip>
        )
    )
    return (
        <div className={className}>
            {method === 'passkey' ? (
                <>
                    <div className="p-2.5 bg-secondary-500 rounded-lg shrink-0">
                        <Fingerprint className="h-5 w-5 text-primary-text" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        {passkeyLabel && (
                            <span className="text-primary-text font-semibold truncate">{passkeyLabel}</span>
                        )}
                        {idReveal}
                    </div>
                </>
            ) : (
                <>
                    <div className="p-2.5 bg-secondary-500 rounded-lg shrink-0">
                        <WalletIcon className="h-5 w-5 text-primary-text" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-primary-text font-semibold">
                            {loginWallet?.displayName || 'EVM Wallet'}
                        </span>
                        {loginWallet?.address && (
                            <button
                                type="button"
                                onClick={onCopyAddress}
                                className="text-secondary-text text-sm text-left hover:text-primary-text truncate"
                            >
                                {new Address(loginWallet.address, null, loginWallet.providerName).toShortString()}
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

interface UserStatusContentProps {
    method: 'passkey' | 'wallet_sign' | null
    loginWallet: LoginWallet | null
    logout: () => void
    onClose?: () => void
    showHeader?: boolean
    showPasskeyWarning?: boolean
}

export const UserStatusContent = ({
    method,
    loginWallet,
    logout,
    onClose,
    showHeader = true,
    showPasskeyWarning = true,
}: UserStatusContentProps) => {
    const { passkeyCredentials, activePasskeyCredentialId } = useSharedSecretDerivation();

    const activePasskeyLabel = passkeyCredentials.find(c => c.id === activePasskeyCredentialId)?.label ?? null;

    const handleLogout = () => {
        logout()
        onClose?.()
    }

    const handleCopyAddress = () => {
        if (loginWallet?.address) {
            navigator.clipboard.writeText(loginWallet.address)
        }
    }

    const info = (
        <>
            {showHeader && (
                <p className="text-secondary-text text-sm font-medium">Connected with</p>
            )}
            <LoginDataCard
                method={method}
                loginWallet={loginWallet}
                passkeyLabel={activePasskeyLabel}
                activePasskeyCredentialId={activePasskeyCredentialId}
                onCopyAddress={handleCopyAddress}
            />

            {showPasskeyWarning && method === 'passkey' && (
                <div className="rounded-xl bg-warning-background border border-warning-foreground/30 px-3 py-2.5">
                    <p className="text-warning-foreground text-sm leading-snug">
                        Store your passkeys securely. Losing your passkey means losing access to your account and any associated funds permanently.
                    </p>
                </div>
            )}
        </>
    )

    const logoutButton = (
        <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-error-background hover:bg-error-background/80 text-error-foreground rounded-xl font-semibold transition-colors"
        >
            <LogOut className="h-5 w-5" strokeWidth={2} />
            <span>Log out</span>
        </button>
    )

    return (
        <StepBody
            info={info}
            actions={logoutButton}
            gap={showHeader ? 'gap-3' : 'gap-2'}
            centerOverlay={false}
            centerNonOverlay={false}
            overlayActionMt="mt-4"
        />
    )
}

export const UserStatusHeader = () => {
    const secretDerivation = useOptionalSecretDerivation()
    const { openLogin, openUserStatus } = useAuthDialog()
    const [openDrawer, setOpenDrawer] = useState(false)
    const { isMobile } = useWindowDimensions()

    if (!secretDerivation) return null

    const { method, isLoggedIn, loginWallet, logout } = secretDerivation

    if (!isLoggedIn) {
        return (
            <button
                type="button"
                onClick={openLogin}
                className="h-11 inline-flex items-center gap-2 py-2 px-3 rounded-full bg-secondary-500 border border-black/15 text-primary-text hover:bg-secondary-400 focus:outline-none transition-colors active:animate-press-down"
            >
                <Lock className="h-5 w-5" strokeWidth={2} />
                <span className="text-sm font-medium">Login</span>
            </button>
        )
    }

    const pillLabel = method === 'passkey'
        ? "Passkey"
        : (loginWallet?.displayName || (loginWallet?.address ? new Address(loginWallet.address, null, loginWallet.providerName).toShortString() : '') || 'Wallet')

    if (isMobile) {
        return (
            <>
                <button
                    type="button"
                    onClick={() => setOpenDrawer(true)}
                    className="p-1.5 max-sm:p-2 justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down relative"
                >
                    {method === 'passkey' ? (
                        <div className="relative">
                            <Fingerprint className="h-6 w-6" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-success-foreground rounded-full border-2 border-secondary-900" />
                        </div>
                    ) : (
                        <div className="relative">
                            <WalletIcon className="h-6 w-6" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-success-foreground rounded-full border-2 border-secondary-900" />
                        </div>
                    )}
                </button>
                <UserStatusDrawer
                    isOpen={openDrawer}
                    onClose={() => setOpenDrawer(false)}
                    method={method}
                    loginWallet={loginWallet}
                    logout={logout}
                />
            </>
        )
    }

    return (
        <button type="button" className="h-11 inline-flex items-center gap-2 py-2 px-3 rounded-full bg-secondary-500 border border-black/15 text-primary-text hover:bg-secondary-400 focus:outline-none transition-colors active:animate-press-down" onClick={() => openUserStatus(() => setOpenDrawer(true))}>
            {method === 'passkey' ? (
                <Fingerprint className="h-5 w-5 shrink-0" strokeWidth={2} />
            ) : (
                <WalletIcon className="h-5 w-5 shrink-0" strokeWidth={2} />
            )}
            <span className="text-sm font-medium truncate max-w-[120px]">{pillLabel}</span>
        </button>
    )
}

export const UserStatusMenu = () => {
    const { isLoggedIn, method, loginWallet, logout, activePasskeyCredentialId, passkeyCredentials } = useSharedSecretDerivation()
    const { openLogin, openUserStatus } = useAuthDialog()
    const [openModal, setOpenModal] = useState(false)
    const activePasskeyLabel = passkeyCredentials.find(c => c.id === activePasskeyCredentialId)?.label ?? null

    if (!isLoggedIn) {
        return (
            <button
                onClick={openLogin}
                type="button"
                className="py-3 px-4 bg-secondary-400 flex items-center w-full rounded-xl space-x-1 relative font-semibold transform border border-secondary-400 hover:bg-secondary-300 transition duration-200 ease-in-out outline-hidden"
            >
                <div className="flex gap-4 items-center text-primary-text w-full">
                    <Lock className="h-5 w-5 shrink-0" strokeWidth={2} />
                    <span>Login</span>
                </div>
            </button>
        )
    }

    const menuLabel = method === 'passkey'
        ? (activePasskeyLabel
            ? `Passkey · ${activePasskeyLabel}${activePasskeyCredentialId ? ` (${formatPasskeyIdForDisplay(activePasskeyCredentialId)})` : ''}`
            : 'Passkey')
        : `${loginWallet?.displayName || 'Wallet'}${loginWallet?.address ? ` · ${new Address(loginWallet.address, null, loginWallet.providerName).toShortString()}` : ''}`

    return (
        <>
            <button
                onClick={() => openUserStatus(() => setOpenModal(true))}
                type="button"
                className="py-3 px-4 bg-secondary-400 flex items-center w-full rounded-xl space-x-1 disabled:text-secondary-text/40 disabled:bg-secondary-600 disabled:cursor-not-allowed relative font-semibold transform border border-secondary-400 hover:bg-secondary-300 transition duration-200 ease-in-out outline-hidden"
            >
                <div className="flex gap-4 items-center text-primary-text w-full min-w-0">
                    {method === 'passkey' ? (
                        <div className="relative shrink-0">
                            <Fingerprint className="h-5 w-5" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success-foreground rounded-full" />
                        </div>
                    ) : (
                        <div className="relative shrink-0">
                            <WalletIcon className="h-5 w-5" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success-foreground rounded-full" />
                        </div>
                    )}
                    <span className="truncate">{menuLabel}</span>
                </div>
            </button>
            <UserStatusDrawer
                isOpen={openModal}
                onClose={() => setOpenModal(false)}
                method={method}
                loginWallet={loginWallet}
                logout={logout}
            />
        </>
    )
}

interface UserStatusDrawerProps {
    isOpen: boolean
    onClose: () => void
    method: 'passkey' | 'wallet_sign' | null
    loginWallet: LoginWallet | null
    logout: () => void
}

const UserStatusDrawer = ({ isOpen, onClose, method, loginWallet, logout }: UserStatusDrawerProps) => {
    return (
        <VaulDrawer
            show={isOpen}
            setShow={onClose}
            header="Login Status"
            modalId="userStatus"
        >
            <VaulDrawer.Snap id="item-1">
                <UserStatusContent
                    method={method}
                    loginWallet={loginWallet}
                    logout={logout}
                    onClose={onClose}
                    showHeader={false}
                    showPasskeyWarning={false}
                />
            </VaulDrawer.Snap>
        </VaulDrawer>
    )
}
