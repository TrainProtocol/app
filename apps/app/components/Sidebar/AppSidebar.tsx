"use client"

import { FC, Suspense } from "react"
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
    SidebarRail,
} from "@/components/shadcn/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/shadcn/tooltip"
import { History, Settings, BookOpen, ArrowUpRight, MoreHorizontal, Home, ChevronsUpDown, LogOut, Lock, MessageCircle, HandCoins } from "lucide-react"
import AppSettings from "@/lib/AppSettings"
import { useIntercom } from "react-use-intercom"
import { useOptionalSecretDerivation } from "@train-protocol/react"
import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { buildHrefWithPersistantParams } from "@/helpers/querryHelper"
import TwitterLogo from "@/components/Icons/TwitterLogo"
import GitHubLogo from "@/components/Icons/GitHubLogo"
import TrainLogo from "@/components/Icons/TrainLogo"
import TrainLogoSymbol from "@/components/Icons/TrainLogoSymbol"
import { useAuthDialog } from "@/stores/authDialogStore"
import { getLoginIdentity } from "@/components/SecretDerivation/UserStatus"
import TelegramLogo from "../Icons/TelegramLogo"

const AppSidebar: FC = () => {
    const currentPath = usePathname() ?? '/'

    return (
        <Sidebar side="left" collapsible="icon" className="hidden md:flex">
            <SidebarHeader className="px-2 py-2 mb-2">
                <Suspense fallback={<SidebarLogo href="/" />}>
                    <SidebarLogoWithParams />
                </Suspense>
            </SidebarHeader>

            <SidebarContent className="px-2">
                <SidebarGroup className="px-0 py-0">
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
                            <Suspense fallback={<NavItems currentPath={currentPath} hrefs={{ home: "/", transactions: "/transactions", settings: "/settings", faucet: "/faucet" }} />}>
                                <NavItemsWithParams currentPath={currentPath} />
                            </Suspense>

                            <SidebarMenuItem>
                                <MoreMenu />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="gap-0 p-0">
                <div className="border-t border-sidebar-border" />
                <div className="px-2 py-2">
                    <SidebarLoginStatus />
                </div>
                {/* <div className="px-3 pt-1 pb-3">
                    <HelpPillButton />
                </div> */}
            </SidebarFooter>
            <SidebarRail />
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
                    <SidebarMenuButton
                        size="lg"
                        tooltip="Log in"
                        className="px-1"
                        onClick={() => { if (isReady) openAuthDialog() }}
                    >
                        <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-secondary-400 text-primary-text shrink-0">
                            <Lock className="size-3.5" strokeWidth={2} />
                        </div>
                        <div className="grid flex-1 text-left leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                            <span className="truncate text-sm font-semibold">Log in</span>
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
                        <SidebarMenuButton
                            size="lg"
                            tooltip={label ?? "Account"}
                            className="px-1 data-[state=open]:bg-secondary-500"
                        >
                            <div className="flex aspect-square size-6 items-center justify-center rounded-full bg-secondary-400 text-primary-text shrink-0">
                                <Icon className="size-3.5" strokeWidth={2} />
                            </div>
                            <div className="grid flex-1 text-left leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                                {label && <span className="truncate text-sm font-semibold">{label}</span>}
                                {idShortWithTooltip}
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-secondary-text shrink-0 group-data-[collapsible=icon]:hidden" />
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

const SidebarLogo: FC<{ href: string }> = ({ href }) => (
    <Link
        href={href}
        prefetch={false}
        aria-label="Home"
        className="group/logo relative flex h-9 w-full items-center rounded-md px-2 cursor-pointer overflow-hidden"
    >
        <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-[96px] rounded-md transition-colors duration-300 ease-in-out group-hover/logo:bg-sidebar-accent group-data-[collapsible=icon]:w-full"
        />
        <TrainLogo className="absolute left-0.5 top-1/2 z-10 h-7 w-auto -translate-y-1/2 text-primary-logoColor fill-primary-text transition-opacity duration-0 group-data-[collapsible=icon]:delay-300 group-data-[collapsible=icon]:opacity-0" />
        <TrainLogoSymbol className="absolute left-[16px] top-1/2 z-10 h-6 w-auto -translate-x-1/2 -translate-y-1/2 text-primary-logoColor fill-primary-text opacity-0 transition-opacity duration-0 group-data-[collapsible=icon]:delay-300 group-data-[collapsible=icon]:opacity-100" />
    </Link>
)

const SidebarLogoWithParams: FC = () => {
    const searchParams = useSearchParams()
    return <SidebarLogo href={buildHrefWithPersistantParams("/", searchParams)} />
}

type NavHrefs = { home: string; transactions: string; settings: string; faucet: string }

const NavItems: FC<{ currentPath: string; hrefs: NavHrefs }> = ({ currentPath, hrefs }) => (
    <>
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPath === "/"} tooltip="Home">
                <Link href={hrefs.home}>
                    <Home />
                    <span>Home</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPath === "/transactions"} tooltip="History">
                <Link href={hrefs.transactions}>
                    <History />
                    <span>History</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>

        {/* {AppSettings.ApiVersion === 'sandbox' && (
            <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={currentPath === "/faucet"} tooltip="Faucet">
                    <Link href={hrefs.faucet}>
                        <HandCoins />
                        <span>Faucet</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        )} */}

        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={currentPath === "/settings"} tooltip="Settings">
                <Link href={hrefs.settings}>
                    <Settings />
                    <span>Settings</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    </>
)

const NavItemsWithParams: FC<{ currentPath: string }> = ({ currentPath }) => {
    const searchParams = useSearchParams()
    return (
        <NavItems
            currentPath={currentPath}
            hrefs={{
                home: buildHrefWithPersistantParams("/", searchParams),
                transactions: buildHrefWithPersistantParams("/transactions", searchParams),
                settings: buildHrefWithPersistantParams("/settings", searchParams),
                faucet: buildHrefWithPersistantParams("/faucet", searchParams),
            }}
        />
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
                <SidebarMenuButton tooltip="More">
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
