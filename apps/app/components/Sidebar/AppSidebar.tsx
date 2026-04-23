"use client"

import { FC, useEffect, useState } from "react"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarSeparator,
} from "@/components/shadcn/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover"
import { History, Settings, BookOpen, ArrowUpRight, MoreHorizontal, ChevronRight, FileText, ShieldCheck, Home } from "lucide-react"
import TwitterLogo from "@/components/Icons/TwitterLogo"
import GitHubLogo from "@/components/Icons/GitHubLogo"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import TrainLogo from "@/components/Icons/TrainLogo"
import { useGoHome } from "@/hooks/useGoHome"
import useWallet from "@/hooks/useWallet"
import WalletIcon from "@/components/Icons/WalletIcon"
import ConnectButton from "@/components/buttons/connectButton"
import { WalletsIcons } from "@/components/Wallet/ConnectedWallets"
import { Address } from "@/lib/address"
import VaulDrawer from "@/components/Modal/vaulModal"
import WalletsList from "@/components/Wallet/WalletsList"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import { UserStatusContent } from "@/components/SecretDerivation/UserStatus"
import { useLoginModalStore } from "@/stores/loginModalStore"
import { useSettingsOverlayStore } from "@/stores/settingsOverlayStore"
import { Fingerprint, Lock } from "lucide-react"
import { formatPasskeyIdForDisplay } from "@train-protocol/auth"

const AppSidebar: FC = () => {
    const router = useRouter()
    const currentPath = usePathname() ?? '/'
    const isSettings = currentPath === '/settings'
    const goHome = useGoHome()
    const { wallets } = useWallet()

    return (
        <Sidebar side="left" collapsible="none" className="hidden md:flex">
            <SidebarHeader className="p-4">
                <div onClick={goHome} className="cursor-pointer">
                    <TrainLogo className="h-auto w-36 text-primary-logoColor fill-primary-text" />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton isActive={currentPath === "/" || currentPath === "/swap"} onClick={() => router.push("/")}>
                                    <Home />
                                    <span>Home</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton isActive={currentPath === "/transactions"} onClick={() => router.push("/transactions")}>
                                    <History />
                                    <span>History</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton isActive={currentPath === "/settings"} onClick={() => router.push("/settings")}>
                                    <Settings />
                                    <span>Settings</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <WalletsSidebarButton wallets={wallets} isSettings={isSettings} />
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="https://v8-docs.layerswap.io/protocol/introduction" target="_blank">
                                        <BookOpen />
                                        <span>Docs</span>
                                        <ArrowUpRight className="ml-auto h-4 w-4" />
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <MoreMenu />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0" />

            <SidebarFooter>
                <SidebarLoginStatus isSettings={isSettings} />
            </SidebarFooter>
        </Sidebar>
    )
}

type WalletsSidebarButtonProps = {
    wallets: ReturnType<typeof useWallet>['wallets']
    isSettings: boolean
}

const WalletsSidebarButton: FC<WalletsSidebarButtonProps> = ({ wallets, isSettings }) => {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const openOverlay = useSettingsOverlayStore((s) => s.open)

    useEffect(() => {
        if (isSettings) setDrawerOpen(false)
    }, [isSettings])

    if (wallets.length === 0) {
        return (
            <SidebarMenuButton asChild>
                <ConnectButton className="w-full">
                    <WalletIcon className="h-4 w-4" strokeWidth={2} />
                    <span>Connect a wallet</span>
                </ConnectButton>
            </SidebarMenuButton>
        )
    }

    const wallet = wallets[0]
    const buttonClassName = wallets.length === 1 ? undefined : "[&_svg]:size-5"
    const buttonContent = wallets.length === 1 ? (
        <>
            <wallet.icon className="h-4 w-4" />
            <span>
                {!wallet.isLoading && wallet.address
                    ? new Address(wallet.address, null, wallet.providerName).toShortString()
                    : 'Wallet'}
            </span>
        </>
    ) : (
        <>
            <WalletsIcons wallets={wallets} />
            <span>Connected wallets</span>
        </>
    )

    if (isSettings) {
        return (
            <SidebarMenuButton className={buttonClassName} onClick={() => openOverlay('wallets')}>
                {buttonContent}
            </SidebarMenuButton>
        )
    }

    return (
        <>
            <SidebarMenuButton className={buttonClassName} onClick={() => setDrawerOpen(true)}>
                {buttonContent}
            </SidebarMenuButton>
            <VaulDrawer
                show={drawerOpen}
                setShow={setDrawerOpen}
                header="Connected wallets"
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1">
                    <WalletsList wallets={wallets} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
}

const SidebarLoginStatus: FC<{ isSettings: boolean }> = ({ isSettings }) => {
    const secretDerivation = useOptionalSecretDerivation()
    const openLoginModal = useLoginModalStore((s) => s.open)
    const closeLoginModal = useLoginModalStore((s) => s.close)
    const openOverlay = useSettingsOverlayStore((s) => s.open)
    const [statusOpen, setStatusOpen] = useState(false)

    useEffect(() => {
        if (isSettings) {
            setStatusOpen(false)
            closeLoginModal()
        }
    }, [isSettings, closeLoginModal])

    if (!secretDerivation) return null

    const { method, isLoggedIn, loginWallet, logout, activePasskeyCredentialId } = secretDerivation

    if (!isLoggedIn) {
        const loggedOutContent = (
            <>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary-400 text-primary-text">
                    <Lock className="size-4" strokeWidth={2} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Login</span>
                    <span className="truncate text-xs text-secondary-text">Not signed in</span>
                </div>
            </>
        )

        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={isSettings ? () => openOverlay('login') : openLoginModal}>
                        {loggedOutContent}
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    const loggedInContent = (
        <>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary-400 text-primary-text">
                {method === 'passkey' ? (
                    <Fingerprint className="size-4" strokeWidth={2} />
                ) : (
                    <WalletIcon className="size-4" strokeWidth={2} />
                )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                    {method === 'passkey' ? 'Passkey' : (loginWallet?.displayName || 'Wallet')}
                </span>
                <span className="truncate text-xs text-secondary-text">
                    {method === 'passkey' && activePasskeyCredentialId
                        ? formatPasskeyIdForDisplay(activePasskeyCredentialId)
                        : loginWallet?.address
                            ? new Address(loginWallet.address, null, loginWallet.providerName).toShortString()
                            : ''}
                </span>
            </div>
        </>
    )

    if (isSettings) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={() => openOverlay('userStatus')}>
                        {loggedInContent}
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={() => setStatusOpen(true)}>
                        {loggedInContent}
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
            <VaulDrawer
                show={statusOpen}
                setShow={setStatusOpen}
                header="Login Status"
                modalId="sidebarUserStatus"
            >
                <VaulDrawer.Snap id="item-1">
                    <UserStatusContent
                        method={method}
                        loginWallet={loginWallet}
                        logout={logout}
                        onClose={() => setStatusOpen(false)}
                        showHeader={false}
                        showPasskeyWarning={false}
                    />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
}

const MORE_LINKS: { name: string; href: string; icon: FC<{ className?: string }> }[] = [
    { name: 'Twitter', href: 'https://x.com/trainprotocol', icon: ({ className }) => <TwitterLogo className={className} /> },
    { name: 'GitHub', href: 'https://github.com/TrainProtocol/app', icon: ({ className }) => <GitHubLogo className={className} /> },
    { name: 'Privacy Policy', href: 'https://docs.layerswap.io/user-docs/information/privacy-policy/', icon: ({ className }) => <ShieldCheck className={className} /> },
    { name: 'Terms of Services', href: 'https://docs.layerswap.io/user-docs/information/terms-of-services/', icon: ({ className }) => <FileText className={className} /> },
]

const MoreMenu: FC = () => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <SidebarMenuButton>
                    <MoreHorizontal />
                    <span className="truncate">More</span>
                    <ChevronRight className="ml-auto" />
                </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                align="end"
                sideOffset={8}
                className="w-64 p-2 bg-secondary-700 border border-border rounded-xl"
            >
                <div className="flex flex-col gap-1">
                    {MORE_LINKS.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            target="_blank"
                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-primary-text hover:bg-secondary-500 transition-colors"
                        >
                            <item.icon className="h-4 w-4" />
                            <span className="truncate">{item.name}</span>
                            <ArrowUpRight className="ml-auto h-4 w-4 opacity-70" />
                        </Link>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}

export default AppSidebar
