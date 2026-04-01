import { useState } from "react"
import { Fingerprint, Lock, LogOut } from "lucide-react"
import VaulDrawer from "../Modal/vaulModal"
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover"
import { useSecretDerivationStore, usePasskeyCredentialId, usePasskeyCredentialIds } from "@/stores/secretDerivationStore"
import { useLoginModalStore } from "@/stores/loginModalStore"
import { Address } from "@/lib/address"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { formatPasskeyIdForDisplay } from "@/lib/htlc/secretDerivation/passkeyService"
import WalletIcon from "../Icons/WalletIcon"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../shadcn/tooltip"

interface LoginWallet {
    address: string
    providerName: string
    displayName?: string
}

interface LoginDataCardProps {
    method: 'passkey' | 'wallet_sign' | null
    loginWallet: LoginWallet | null
    passkeyCredentialId: string | null
    onCopyAddress: () => void
    className?: string
}

export const LoginDataCard = ({
    method,
    loginWallet,
    passkeyCredentialId,
    onCopyAddress,
    className = "flex items-center gap-3 p-3 bg-secondary-500 rounded-xl",
}: LoginDataCardProps) => (
    <div className={className}>
        {method === 'passkey' ? (
            <>
                <div className="p-2.5 bg-secondary-500 rounded-lg shrink-0">
                    <Fingerprint className="h-5 w-5 text-primary-text" strokeWidth={2} />
                </div>
                <div className="flex flex-col flex-1 min-w-0 text-left">
                    <span className="text-primary-text font-semibold">Passkey</span>
                    {passkeyCredentialId && (
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-secondary-text text-sm truncate cursor-default w-fit">{formatPasskeyIdForDisplay(passkeyCredentialId)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-mono break-all max-w-[280px]">{passkeyCredentialId}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </>
        ) : (
            <>
                <div className="p-2.5 bg-secondary-500 rounded-lg shrink-0">
                    <WalletIcon className="h-5 w-5 text-primary-text" strokeWidth={2} />
                </div>
                <div className="flex flex-col flex-1 min-w-0 text-left">
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
    const credentialIds = usePasskeyCredentialIds();
    const activeId = usePasskeyCredentialId();
    const removeCredential = useSecretDerivationStore((s) => s.removePasskeyCredential);
    const { isMobile } = useWindowDimensions();

    const handleLogout = () => {
        logout()
        onClose?.()
    }

    const handleCopyAddress = () => {
        if (loginWallet?.address) {
            navigator.clipboard.writeText(loginWallet.address)
        }
    }

    const handleRemoveCredential = (credId: string) => {
        removeCredential(credId);
    };

    return (
        <div className={`flex flex-col ${showHeader ? 'gap-3' : 'gap-2'}`}>
            {showHeader && (
                <p className="text-secondary-text text-sm font-medium">Connected with</p>
            )}
            <LoginDataCard
                method={method}
                loginWallet={loginWallet}
                passkeyCredentialId={activeId}
                onCopyAddress={handleCopyAddress}
            />

            {method === 'passkey' && credentialIds.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-secondary-text text-xs font-medium uppercase">Registered passkeys</p>
                    {credentialIds.map(id => (
                        <div key={id} className="flex items-center justify-between p-2 bg-secondary-500 rounded-lg">
                            {isMobile ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <span className="text-sm text-primary-text cursor-pointer">
                                            {formatPasskeyIdForDisplay(id)}
                                            {id === activeId && <span className="text-success-foreground ml-1">(active)</span>}
                                        </span>
                                    </PopoverTrigger>
                                    <PopoverContent side="top" className="w-auto p-2 bg-secondary-500! rounded-lg!">
                                        <p className="font-mono break-all max-w-[280px] text-xs text-primary-text">{id}</p>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="text-sm text-primary-text cursor-default w-fit">
                                                {formatPasskeyIdForDisplay(id)}
                                                {id === activeId && <span className="text-success-foreground ml-1">(active)</span>}
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-mono break-all max-w-[280px]">{id}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                            {credentialIds.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => handleRemoveCredential(id)}
                                    className="text-xs text-error-foreground hover:text-error-foreground/80"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-error-background hover:bg-error-background/80 text-error-foreground rounded-xl font-semibold transition-colors"
            >
                <LogOut className="h-5 w-5" strokeWidth={2} />
                <span>Log out</span>
            </button>
        </div>
    )
}

export const UserStatusHeader = () => {
    const {
        method,
        isLoggedIn,
        loginWallet,
        logout,
    } = useSecretDerivationStore()
    const openLoginModal = useLoginModalStore((s) => s.open)
    const [openDrawer, setOpenDrawer] = useState(false)
    const [openPopover, setOpenPopover] = useState(false)
    const { isMobile } = useWindowDimensions()

    if (!isLoggedIn) {
        return (
            <button
                type="button"
                onClick={openLoginModal}
                className="inline-flex items-center gap-2 py-2 px-3 rounded-full bg-secondary-500 border border-black/15 text-primary-text hover:bg-secondary-400 focus:outline-none transition-colors active:animate-press-down"
            >
                <Lock className="h-5 w-5" strokeWidth={2} />
                <span className="text-sm font-medium">Login</span>
            </button>
        )
    }

    const pillLabel = method === 'passkey'
        ? "Passkey"
        : (loginWallet?.displayName || (loginWallet?.address ? new Address(loginWallet.address, null, loginWallet.providerName).toShortString() : '') || 'Wallet')

    const pillContent = (
        <>
            {method === 'passkey' ? (
                <Fingerprint className="h-5 w-5 shrink-0" strokeWidth={2} />
            ) : (
                <WalletIcon className="h-5 w-5 shrink-0" strokeWidth={2} />
            )}
            <span className="text-sm font-medium truncate max-w-[120px]">{pillLabel}</span>
        </>
    )

    const pillClassName = "inline-flex items-center gap-2 py-2 px-3 rounded-full bg-secondary-500 border border-black/15 text-primary-text hover:bg-secondary-400 focus:outline-none transition-colors active:animate-press-down"

    return (
        <>
            {isMobile ? (
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
            ) : (
                <Popover open={openPopover} onOpenChange={setOpenPopover}>
                    <PopoverTrigger asChild>
                        <button type="button" className={pillClassName}>
                            {pillContent}
                        </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={8} className="w-80">
                        <UserStatusContent
                            method={method}
                            loginWallet={loginWallet}
                            logout={logout}
                            onClose={() => setOpenPopover(false)}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </>
    )
}

export const UserStatusMenu = ({ onLogin, onViewLoginStatus }: { onLogin?: () => void; onViewLoginStatus?: () => void } = {}) => {
    const { isLoggedIn, method, loginWallet, logout } = useSecretDerivationStore()
    const openLoginModal = useLoginModalStore((s) => s.open)
    const [openModal, setOpenModal] = useState(false)
    const activeCredentialId = usePasskeyCredentialId()

    const handleLogin = onLogin ?? openLoginModal

    if (!isLoggedIn) {
        return (
            <button
                onClick={handleLogin}
                type="button"
                className="py-3 px-4 bg-secondary-400 flex items-center w-full rounded-xl relative font-semibold transform border border-secondary-400 hover:bg-secondary-300 transition duration-200 ease-in-out outline-hidden text-primary-text"
            >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <Lock className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="grow text-center">Login</span>
            </button>
        )
    }

    const menuLabel = method === 'passkey'
        ? (activeCredentialId ? `Passkey · ${formatPasskeyIdForDisplay(activeCredentialId)}` : 'Passkey')
        : `${loginWallet?.displayName || 'Wallet'}${loginWallet?.address ? ` · ${new Address(loginWallet.address, null, loginWallet.providerName).toShortString()}` : ''}`

    return (
        <>
            <button
                onClick={onViewLoginStatus ?? (() => setOpenModal(true))}
                type="button"
                className="py-3 px-4 bg-secondary-400 flex items-center w-full rounded-xl relative font-semibold transform border border-secondary-400 hover:bg-secondary-300 transition duration-200 ease-in-out outline-hidden text-primary-text"
            >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    {method === 'passkey' ? (
                        <div className="relative">
                            <Fingerprint className="h-5 w-5" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success-foreground rounded-full" />
                        </div>
                    ) : (
                        <div className="relative">
                            <WalletIcon className="h-5 w-5" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-success-foreground rounded-full" />
                        </div>
                    )}
                </span>
                <span className="grow text-center truncate">{menuLabel}</span>
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
