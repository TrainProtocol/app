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
import { useGoHome } from "@/hooks/useGoHome"
import { useAppDialogueStore } from "@/stores/appDialogueStore"
import { getLoginIdentity } from "@/components/SecretDerivation/UserStatus"

const AppSidebar: FC = () => {
    const currentPath = usePathname() ?? '/'
    const goHome = useGoHome()

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
                        <HelpSidebarButton />
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

const HelpSidebarButton: FC = () => {
    const { boot, show, update } = useIntercom()
    return (
        <SidebarMenuButton onClick={() => { boot(); show(); update() }}>
            <ChatIcon strokeWidth={2} />
            <span>Get help</span>
        </SidebarMenuButton>
    )
}

const SidebarLoginStatus: FC = () => {
    const secretDerivation = useOptionalSecretDerivation()
    const openDialogue = useAppDialogueStore((s) => s.open)

    if (!secretDerivation) return null

    const { method, isLoggedIn, isReady, loginWallet, activePasskeyCredentialId, passkeyCredentials, logout } = secretDerivation

    if (!isLoggedIn) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={() => { if (isReady) openDialogue('login') }}>
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
    const { Icon, label, idShort } = getLoginIdentity(method, loginWallet, activePasskeyLabel, activePasskeyCredentialId)

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
                                {label && <span className="truncate font-semibold">{label}</span>}
                                {idShort && <span className="truncate text-xs text-secondary-text">{idShort}</span>}
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-secondary-text" />
                        </SidebarMenuButton>
                    </PopoverTrigger>
                    <PopoverContent
                        side="right"
                        align="end"
                        sideOffset={8}
                        className="w-56 p-1 bg-secondary-700 rounded-xl"
                    >
                        <div className="flex flex-col gap-0.5">
                            <div className="flex h-12 items-center gap-2 overflow-hidden p-2">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-secondary-400 text-primary-text shrink-0">
                                    <Icon className="size-4" strokeWidth={2} />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                                    {label && <span className="truncate font-semibold">{label}</span>}
                                    {idShort && <span className="truncate text-xs text-secondary-text">{idShort}</span>}
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
