"use client"

import { FC } from "react"
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
import { History, Settings, BookOpen, ArrowUpRight, MoreHorizontal, FileText, ShieldCheck, Home, ChevronsUpDown, LogOut, Lock } from "lucide-react"
import { useIntercom } from "react-use-intercom"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import ChatIcon from "@/components/Icons/ChatIcon"
import TwitterLogo from "@/components/Icons/TwitterLogo"
import GitHubLogo from "@/components/Icons/GitHubLogo"
import TrainLogo from "@/components/Icons/TrainLogo"
import WalletIcon from "@/components/Icons/WalletIcon"
import { WalletsIcons } from "@/components/Wallet/ConnectedWallets"
import { useGoHome } from "@/hooks/useGoHome"
import useWallet from "@/hooks/useWallet"
import { Address } from "@/lib/address"
import { useAppDialogueStore } from "@/stores/appDialogueStore"
import { LoginDataCard, getLoginIdentity, copyWalletAddress } from "@/components/SecretDerivation/UserStatus"

const AppSidebar: FC = () => {
    const currentPath = usePathname() ?? '/'
    const goHome = useGoHome()
    const { wallets } = useWallet()

    return (
        <Sidebar side="left" collapsible="none" className="hidden md:flex px-4">
            <SidebarHeader className="px-0 py-4">
                <div onClick={goHome} className="cursor-pointer">
                    <TrainLogo className="h-auto w-36 text-primary-logoColor fill-primary-text" />
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup className="px-0">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={currentPath === "/"}>
                                    <Link href="/">
                                        <Home />
                                        <span>Home</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={currentPath === "/transactions"}>
                                    <Link href="/transactions">
                                        <History />
                                        <span>History</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton asChild isActive={currentPath === "/settings"}>
                                    <Link href="/settings">
                                        <Settings />
                                        <span>Settings</span>
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

            <SidebarFooter className="gap-0 p-0">
                <SidebarMenu className="pb-2">
                    <SidebarMenuItem>
                        <WalletsSidebarButton wallets={wallets} />
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarSeparator className="-mx-4 data-horizontal:w-[calc(100%+2rem)]" />
                <div className="py-2">
                    <SidebarLoginStatus />
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

type WalletsSidebarButtonProps = {
    wallets: ReturnType<typeof useWallet>['wallets']
}

const WalletsSidebarButton: FC<WalletsSidebarButtonProps> = ({ wallets }) => {
    const openDialogue = useAppDialogueStore((s) => s.open)

    const wallet = wallets[0]
    const hasWallets = wallets.length > 0
    const isMulti = wallets.length > 1

    const handleClick = () => {
        openDialogue(hasWallets ? 'wallets' : 'connectWallet')
    }

    const content = !hasWallets ? (
        <>
            <WalletIcon className="h-4 w-4" strokeWidth={2} />
            <span>Connect a wallet</span>
        </>
    ) : isMulti ? (
        <>
            <WalletsIcons wallets={wallets} />
            <span>Connected wallets</span>
        </>
    ) : (
        <>
            <wallet.icon className="h-4 w-4" />
            <span>
                {!wallet.isLoading && wallet.address
                    ? new Address(wallet.address, null, wallet.providerName).toShortString()
                    : 'Wallet'}
            </span>
        </>
    )

    return (
        <SidebarMenuButton className={isMulti ? "[&_svg]:size-5" : undefined} onClick={handleClick}>
            {content}
        </SidebarMenuButton>
    )
}

const SidebarLoginStatus: FC = () => {
    const secretDerivation = useOptionalSecretDerivation()
    const openDialogue = useAppDialogueStore((s) => s.open)
    const { boot, show, update } = useIntercom()

    if (!secretDerivation) return null

    const { method, isLoggedIn, loginWallet, activePasskeyCredentialId, passkeyCredentials, logout } = secretDerivation

    if (!isLoggedIn) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={() => openDialogue('login')}>
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary-400 text-primary-text">
                            <Lock className="size-4" strokeWidth={2} />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">Login</span>
                            <span className="truncate text-xs text-secondary-text">Not signed in</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    const activePasskeyLabel = passkeyCredentials.find(c => c.id === activePasskeyCredentialId)?.label ?? null
    const { Icon, title: methodTitle, label: methodLabel } = getLoginIdentity(method, loginWallet, activePasskeyLabel)

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Popover>
                    <PopoverTrigger asChild>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-secondary-500">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary-400 text-primary-text">
                                <Icon className="size-4" strokeWidth={2} />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{methodTitle}</span>
                                <span className="truncate text-xs text-secondary-text">{methodLabel}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-secondary-text" />
                        </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent
                        side="top"
                        align="start"
                        sideOffset={8}
                        className="p-1 bg-secondary-700 border border-border rounded-xl"
                    >
                        <div className="flex flex-col gap-0.5">
                            <LoginDataCard
                                method={method}
                                loginWallet={loginWallet}
                                passkeyLabel={activePasskeyLabel}
                                activePasskeyCredentialId={activePasskeyCredentialId}
                                onCopyAddress={() => copyWalletAddress(loginWallet)}
                            />
                            <div className="my-1 h-px bg-border" />
                            <button
                                type="button"
                                onClick={() => { boot(); show(); update() }}
                                className="flex h-9 w-full items-center gap-2 rounded-md p-2 text-sm text-primary-text hover:bg-secondary-500 transition-colors text-left [&_svg]:size-4"
                            >
                                <ChatIcon strokeWidth={2} />
                                <span>Help</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => logout()}
                                className="flex h-9 w-full items-center gap-2 rounded-md p-2 text-sm text-error-foreground hover:bg-error-background transition-colors text-left [&_svg]:size-4"
                            >
                                <LogOut />
                                <span>Log out</span>
                            </button>
                        </div>
                    </PopoverContent>
                </Popover>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

const MORE_LINKS: { name: string; href: string; icon: FC<{ className?: string }> }[] = [
    { name: 'Docs', href: 'https://v8-docs.layerswap.io/protocol/introduction', icon: ({ className }) => <BookOpen className={className} /> },
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
