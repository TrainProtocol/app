import { useState } from "react"
import { Fingerprint, LogOut } from "lucide-react"
import toast from "react-hot-toast"
import VaulDrawer from "../Modal/vaulModal"
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover"
import { useSecretDerivationStore } from "@/stores/secretDerivationStore"
import shortenAddress from "../utils/ShortenAddress"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { getStoredCredentialId, formatPasskeyIdForDisplay } from "@/lib/htlc/secretDerivation/passkeyService"
import WalletIcon from "../Icons/WalletIcon"

interface UserStatusContentProps {
    method: 'passkey' | 'wallet_sign' | null
    loginWallet: {
        address: string
        chainId?: string | number
        providerName: string
        displayName?: string
    } | null
    logout: () => void
    onClose?: () => void
}

const UserStatusContent = ({ method, loginWallet, logout, onClose }: UserStatusContentProps) => {
    const handleLogout = () => {
        logout()
        onClose?.()
        toast.success('Logged out successfully')
    }

    const handleCopyAddress = () => {
        if (loginWallet?.address) {
            navigator.clipboard.writeText(loginWallet.address)
            toast.success('Address copied')
        }
    }

    const passkeyCredId = method === 'passkey' ? getStoredCredentialId() : null
    const displayId = passkeyCredId ? formatPasskeyIdForDisplay(passkeyCredId) : null

    return (
        <div className="flex flex-col gap-3">
            <p className="text-secondary-text text-sm font-medium">Connected with</p>
            <div className="flex items-center gap-3 p-3 bg-secondary-700 rounded-xl">
                {method === 'passkey' ? (
                    <>
                        <div className="p-2.5 bg-secondary-500 rounded-lg shrink-0">
                            <Fingerprint className="h-5 w-5 text-primary-text" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-primary-text font-semibold">Passkey</span>
                            {displayId && (
                                <span className="text-secondary-text text-sm truncate">{displayId}</span>
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
                                    onClick={handleCopyAddress}
                                    className="text-secondary-text text-sm text-left hover:text-primary-text truncate"
                                >
                                    {shortenAddress(loginWallet.address)}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {method === 'passkey' && (
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
    } = useSecretDerivationStore()
    const [openDrawer, setOpenDrawer] = useState(false)
    const [openPopover, setOpenPopover] = useState(false)
    const { isMobile } = useWindowDimensions()

    if (!isLoggedIn) return null

    const pillLabel = method === 'passkey'
        ? 'passkey'
        : (loginWallet?.displayName || shortenAddress(loginWallet?.address ?? '') || 'Wallet')

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
    const { isLoggedIn, method, loginWallet, logout } = useSecretDerivationStore()
    const [openModal, setOpenModal] = useState(false)

    if (!isLoggedIn) return null

    return (
        <>
            <button
                onClick={() => setOpenModal(true)}
                type="button"
                className="py-3 px-4 bg-secondary-500 flex items-center w-full rounded-xl space-x-1 disabled:text-secondary-text/40 disabled:bg-primary-900 disabled:cursor-not-allowed relative font-semibold transform border border-secondary-500 hover:bg-secondary-400 transition duration-200 ease-in-out outline-hidden"
            >
                <div className="flex gap-4 items-center text-primary-text w-full">
                    {method === 'passkey' ? (
                        <>
                            <div className="relative">
                                <Fingerprint className="h-5 w-5" strokeWidth={2} />
                                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full" />
                            </div>
                            <span>Logged in with Passkey</span>
                        </>
                    ) : (
                        <>
                            <div className="relative">
                                <WalletIcon className="h-5 w-5" strokeWidth={2} />
                                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full" />
                            </div>
                            <span>
                                {loginWallet?.displayName || 'Wallet'}{' '}
                                {loginWallet?.address && (
                                    <span className="text-secondary-text">
                                        ({shortenAddress(loginWallet.address)})
                                    </span>
                                )}
                            </span>
                        </>
                    )}
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
    loginWallet: {
        address: string
        chainId?: string | number
        providerName: string
        displayName?: string
    } | null
    logout: () => void
}

/** Old drawer content for mobile: Login Status card + logout (no "Connected with" / warning) */
const UserStatusDrawerContent = ({ method, loginWallet, logout, onClose }: UserStatusContentProps) => {
    const handleLogout = () => {
        logout()
        onClose?.()
        toast.success('Logged out successfully')
    }

    const handleCopyAddress = () => {
        if (loginWallet?.address) {
            navigator.clipboard.writeText(loginWallet.address)
            toast.success('Address copied')
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 p-4 bg-secondary-700 rounded-xl">
                {method === 'passkey' ? (
                    <>
                        <div className="p-3 bg-secondary-500 rounded-lg">
                            <Fingerprint className="h-6 w-6 text-primary-text" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-primary-text font-semibold">Passkey</span>
                            <span className="text-secondary-text text-sm">Face ID, Touch ID, or Security Key</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-3 bg-secondary-500 rounded-lg">
                            <WalletIcon className="h-6 w-6 text-primary-text" strokeWidth={2} />
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-primary-text font-semibold">
                                {loginWallet?.displayName || 'EVM Wallet'}
                            </span>
                            {loginWallet?.address && (
                                <button
                                    type="button"
                                    onClick={handleCopyAddress}
                                    className="text-secondary-text text-sm text-left hover:text-primary-text truncate"
                                >
                                    {loginWallet.address}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>
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

const UserStatusDrawer = ({ isOpen, onClose, method, loginWallet, logout }: UserStatusDrawerProps) => {
    const handleClose = () => {
        onClose()
    }

    return (
        <VaulDrawer
            show={isOpen}
            setShow={onClose}
            header="Login Status"
            modalId="userStatus"
        >
            <VaulDrawer.Snap id="item-1">
                <UserStatusDrawerContent
                    method={method}
                    loginWallet={loginWallet}
                    logout={logout}
                    onClose={handleClose}
                />
            </VaulDrawer.Snap>
        </VaulDrawer>
    )
}
