import { useState } from "react"
import { Fingerprint, Lock, LogOut } from "lucide-react"
import VaulDrawer from "../Modal/vaulModal"
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover"
import { useSharedSecretDerivation } from "@train-protocol/react"
import { useLoginModalStore } from "@/stores/loginModalStore"
import { Address } from "@/lib/address"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { formatPasskeyIdForDisplay } from "@train-protocol/auth"
import WalletIcon from "../Icons/WalletIcon"

const usePasskeyDisplayId = () => {
    const { method, passkeyCredentials } = useSharedSecretDerivation()
    const activeId = passkeyCredentials[passkeyCredentials.length - 1] ?? null
    return method === 'passkey' && activeId ? formatPasskeyIdForDisplay(activeId) : null
}

interface LoginWallet {
    address: string
    providerName: string
    displayName?: string
}

interface LoginDataCardProps {
    method: 'passkey' | 'wallet_sign' | null
    loginWallet: LoginWallet | null
    passkeyDisplayId: string | null
    onCopyAddress: () => void
    className?: string
}

const LoginDataCard = ({
    method,
    loginWallet,
    passkeyDisplayId,
    onCopyAddress,
    className = "flex items-center gap-3 p-3 bg-secondary-700 rounded-xl",
}: LoginDataCardProps) => (
    <div className={className}>
        {method === 'passkey' ? (
            <>
                <div className="p-2.5 bg-secondary-500 rounded-lg shrink-0">
                    <Fingerprint className="h-5 w-5 text-primary-text" strokeWidth={2} />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-primary-text font-semibold">Passkey</span>
                    {passkeyDisplayId && (
                        <span className="text-secondary-text text-sm truncate">{passkeyDisplayId}</span>
                    )}
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

interface UserStatusContentProps {
    method: 'passkey' | 'wallet_sign' | null
    loginWallet: LoginWallet | null
    logout: () => void
    onClose?: () => void
    showHeader?: boolean
    showPasskeyWarning?: boolean
}

const UserStatusContent = ({
    method,
    loginWallet,
    logout,
    onClose,
    showHeader = true,
    showPasskeyWarning = true,
}: UserStatusContentProps) => {
    const { passkeyCredentials, removePasskeyCredential } = useSharedSecretDerivation();
    const activeId = passkeyCredentials[passkeyCredentials.length - 1] ?? null;

    const handleLogout = () => {
        logout()
        onClose?.()
    }

    const handleCopyAddress = () => {
        if (loginWallet?.address) {
            navigator.clipboard.writeText(loginWallet.address)
        }
    }

    const passkeyDisplayId = usePasskeyDisplayId()

    return (
        <div className={`flex flex-col ${showHeader ? 'gap-3' : 'gap-2'}`}>
            {showHeader && (
                <p className="text-secondary-text text-sm font-medium">Connected with</p>
            )}
            <LoginDataCard
                method={method}
                loginWallet={loginWallet}
                passkeyDisplayId={passkeyDisplayId}
                onCopyAddress={handleCopyAddress}
            />

            {method === 'passkey' && passkeyCredentials.length > 0 && (
                <div className="flex flex-col gap-2">
                    <p className="text-secondary-text text-xs font-medium uppercase">Registered passkeys</p>
                    {passkeyCredentials.map(id => (
                        <div key={id} className="flex items-center justify-between p-2 bg-secondary-700 rounded-lg">
                            <span className="text-sm text-primary-text">
                                {formatPasskeyIdForDisplay(id)}
                                {id === activeId && <span className="text-green-400 ml-1">(active)</span>}
                            </span>
                            {passkeyCredentials.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removePasskeyCredential(id)}
                                    className="text-xs text-red-400 hover:text-red-300"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showPasskeyWarning && method === 'passkey' && (
                <div className="rounded-xl bg-amber-900/40 border border-amber-700/50 px-3 py-2.5">
                    <p className="text-amber-200/90 text-sm leading-snug">
                        Store your passkeys securely. Losing your passkey means losing access to your account and any associated funds permanently.
                    </p>
                </div>
            )}

            <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-semibold transition-colors"
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
    } = useSharedSecretDerivation()
    const openLoginModal = useLoginModalStore((s) => s.open)
    const [openDrawer, setOpenDrawer] = useState(false)
    const [openPopover, setOpenPopover] = useState(false)
    const { isMobile } = useWindowDimensions()

    if (!isLoggedIn) {
        return (
            <button
                type="button"
                onClick={openLoginModal}
                className="inline-flex items-center gap-2 py-2 px-3 rounded-full bg-secondary-500 text-primary-text hover:bg-secondary-400 focus:outline-none transition-colors active:animate-press-down"
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

    const pillClassName = "inline-flex items-center gap-2 py-2 px-3 rounded-full bg-secondary-500 text-primary-text hover:bg-secondary-400 focus:outline-none transition-colors active:animate-press-down"

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
                                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-secondary-900" />
                            </div>
                        ) : (
                            <div className="relative">
                                <WalletIcon className="h-6 w-6" strokeWidth={2} />
                                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-secondary-900" />
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
                    <PopoverContent align="end" sideOffset={8} className="w-80 p-4 bg-secondary-900 border-secondary-600 rounded-xl">
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

export const UserStatusMenu = () => {
    const { isLoggedIn, method, loginWallet, logout } = useSharedSecretDerivation()
    const openLoginModal = useLoginModalStore((s) => s.open)
    const [openModal, setOpenModal] = useState(false)
    const passkeyDisplayId = usePasskeyDisplayId()

    if (!isLoggedIn) {
        return (
            <button
                onClick={openLoginModal}
                type="button"
                className="py-3 px-4 bg-secondary-500 flex items-center w-full rounded-xl space-x-1 relative font-semibold transform border border-secondary-500 hover:bg-secondary-400 transition duration-200 ease-in-out outline-hidden"
            >
                <div className="flex gap-4 items-center text-primary-text w-full">
                    <Lock className="h-5 w-5 shrink-0" strokeWidth={2} />
                    <span>Login</span>
                </div>
            </button>
        )
    }

    const menuLabel = method === 'passkey'
        ? (passkeyDisplayId ? `Passkey · ${passkeyDisplayId}` : 'Passkey')
        : `${loginWallet?.displayName || 'Wallet'}${loginWallet?.address ? ` · ${new Address(loginWallet.address, null, loginWallet.providerName).toShortString()}` : ''}`

    return (
        <>
            <button
                onClick={() => setOpenModal(true)}
                type="button"
                className="py-3 px-4 bg-secondary-500 flex items-center w-full rounded-xl space-x-1 disabled:text-secondary-text/40 disabled:bg-primary-900 disabled:cursor-not-allowed relative font-semibold transform border border-secondary-500 hover:bg-secondary-400 transition duration-200 ease-in-out outline-hidden"
            >
                <div className="flex gap-4 items-center text-primary-text w-full min-w-0">
                    {method === 'passkey' ? (
                        <div className="relative shrink-0">
                            <Fingerprint className="h-5 w-5" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full" />
                        </div>
                    ) : (
                        <div className="relative shrink-0">
                            <WalletIcon className="h-5 w-5" strokeWidth={2} />
                            <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full" />
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
