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
} from "@/components/shadcn/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"
import { History, Settings, BookOpen, ArrowUpRight, MoreHorizontal, Home, ChevronsUpDown, LogOut, Lock, MessageCircle } from "lucide-react"
import { useIntercom } from "react-use-intercom"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import TwitterLogo from "@/components/Icons/TwitterLogo"
import GitHubLogo from "@/components/Icons/GitHubLogo"
import TrainLogo from "@/components/Icons/TrainLogo"
import { useGoHome } from "@/hooks/useGoHome"
import { useAuthDialog } from "@/stores/authDialogStore"
import { getLoginIdentity } from "@/components/SecretDerivation/UserStatus"
import TelegramLogo from "../Icons/TelegramLogo"

const AppSidebar: FC = () => {
    const currentPath = usePathname() ?? '/'
    const goHome = useGoHome()

    return (
        <Sidebar side="left" collapsible="none" className="hidden md:flex">
            <SidebarHeader className="px-2 py-2 mb-2">
                <button
                    type="button"
                    onClick={goHome}
                    aria-label="Home"
                    className="flex h-9 w-fit items-center rounded-md px-2 hover:bg-sidebar-accent transition-colors cursor-pointer"
                >
                    <TrainLogo className="h-7 -ml-1 w-auto text-primary-logoColor fill-primary-text" />
                </button>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup className="px-0 py-0">
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
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
                <div className="border-t border-sidebar-border" />
                <div className="px-2 pt-2">
                    <SidebarLoginStatus />
                </div>
                {/* <div className="px-3 pt-1 pb-3">
                    <HelpPillButton />
                </div> */}
            </SidebarFooter>
        </Sidebar>
    )
}

const HelpPillButton: FC = () => {
    const { boot, show, update } = useIntercom()
    return (
        <button
            type="button"
            onClick={() => { boot(); show(); update() }}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-sidebar-border bg-sidebar px-3 py-2 text-xs font-medium text-primary-text hover:bg-sidebar-accent transition-colors"
        >
            <MessageCircle className="size-4" strokeWidth={2} />
            <span>Get help</span>
        </button>
    )
}

const SidebarLoginStatus: FC = () => {
    const secretDerivation = useOptionalSecretDerivation()
    const openAuthDialog = useAuthDialog((s) => s.openAuthDialog)

    if (!secretDerivation) return null

    const { method, isLoggedIn, isReady, loginWallet, activePasskeyCredentialId, passkeyCredentials, logout } = secretDerivation

    if (!isLoggedIn) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={() => { if (isReady) openAuthDialog() }}>
                        <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-secondary-400 text-primary-text shrink-0">
                            <Lock className="size-3.5" strokeWidth={2} />
                        </div>
                        <div className="grid flex-1 text-left leading-tight min-w-0">
                            <span className="truncate text-sm font-semibold">Login</span>
                            <span className="truncate text-xs text-secondary-text">Not signed in</span>
                        </div>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        )
    }

    const activePasskeyLabel = passkeyCredentials.find(c => c.id === activePasskeyCredentialId)?.label ?? null
    const { Icon, label, idShort, isPasskey } = getLoginIdentity(method, loginWallet, activePasskeyLabel, activePasskeyCredentialId)
    const idFull = isPasskey ? activePasskeyCredentialId : (loginWallet?.address ?? null)

    const idShortWithTooltip = idShort && (idFull ? (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="truncate text-xs text-secondary-text cursor-default">{idShort}</span>
            </TooltipTrigger>
            <TooltipContent side="top">
                <p className="font-mono break-all max-w-[280px]">{idFull}</p>
            </TooltipContent>
        </Tooltip>
    ) : (
        <span className="truncate text-xs text-secondary-text">{idShort}</span>
    ))

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Popover>
                    <PopoverTrigger asChild>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-secondary-500">
                            <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-secondary-400 text-primary-text shrink-0">
                                <Icon className="size-3.5" strokeWidth={2} />
                            </div>
                            <div className="grid flex-1 text-left leading-tight min-w-0">
                                {label && <span className="truncate text-sm font-semibold">{label}</span>}
                                {idShortWithTooltip}
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-secondary-text shrink-0" />
                        </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent
                        side="right"
                        align="end"
                        sideOffset={8}
                        className="w-56 p-1 bg-secondary-700 border border-border rounded-xl"
                    >
                        <div className="flex flex-col gap-0.5">
                            <div className="flex h-12 items-center gap-2 overflow-hidden p-2">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary-400 text-primary-text shrink-0">
                                    <Icon className="size-4" strokeWidth={2} />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                                    {label && <span className="truncate font-semibold">{label}</span>}
                                    {idShortWithTooltip}
                                </div>
                            </div>
                            <div className="my-1 h-px bg-border" />
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
    { name: 'Telegram', href: 'https://t.me/trainprotocol', icon: ({ className }) => <TelegramLogo className={className} /> }
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
