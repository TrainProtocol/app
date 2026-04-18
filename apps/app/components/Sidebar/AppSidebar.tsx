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
import { Home, ArrowLeftRight, History, Settings, BookOpen, ArrowUpRight } from "lucide-react"
import { useRouter } from "next/router"
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
import { Fingerprint, Lock } from "lucide-react"
import { formatPasskeyIdForDisplay } from "@train-protocol/auth"

const AppSidebar: FC = () => {
    const isTestnet = process.env.NEXT_PUBLIC_API_VERSION == 'sandbox'
    const router = useRouter()
    const goHome = useGoHome()
    const { wallets } = useWallet()
    const [walletsDrawerOpen, setWalletsDrawerOpen] = useState(false)
    const [currentPath, setCurrentPath] = useState<string>('/')

    useEffect(() => {
        const sync = () => setCurrentPath(window.location.pathname)
        sync()
        window.addEventListener('popstate', sync)
        return () => window.removeEventListener('popstate', sync)
    }, [])

    const handleTransactions = () => {
        const basePath = router.basePath || ""
        const url = window.location.protocol + "//" + window.location.host + basePath + "/transactions"
        window.history.pushState({ ...window.history.state, as: router.asPath, url }, '', url)
        window.dispatchEvent(new Event('popstate'))
    }

    const handleApp = () => {
        const basePath = router.basePath || ""
        const url = window.location.protocol + "//" + window.location.host + basePath + "/"
        window.history.replaceState({ ...window.history.state, as: '/', url }, '', url)
        window.dispatchEvent(new Event('popstate'))
    }

    const handleSettings = () => {
        const basePath = router.basePath || ""
        const url = window.location.protocol + "//" + window.location.host + basePath + "/settings"
        window.history.pushState({ ...window.history.state, as: router.asPath, url }, '', url)
        window.dispatchEvent(new Event('popstate'))
    }

    return (
        <Sidebar side="left" collapsible="none">
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
                                <SidebarMenuButton isActive={currentPath === "/" || currentPath === "/swap"} onClick={handleApp}>
                                    <ArrowLeftRight />
                                    <span>App</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton isActive={currentPath === "/transactions"} onClick={handleTransactions}>
                                    <History />
                                    <span>Transactions</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <SidebarMenuButton isActive={currentPath === "/settings"} onClick={handleSettings}>
                                    <Settings />
                                    <span>Settings</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>

                            <SidebarMenuItem>
                                <WalletsSidebarButton
                                    wallets={wallets}
                                    onOpenDrawer={() => setWalletsDrawerOpen(true)}
                                />
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton asChild>
                                    <Link href="https://www.train.tech/" target="_blank">
                                        <Home />
                                        <span>Home</span>
                                        <ArrowUpRight className="ml-auto h-4 w-4" />
                                    </Link>
                                </SidebarMenuButton>
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
                                <SidebarMenuButton asChild>
                                    <Link
                                        href={isTestnet ? 'https://app.train.tech/' : 'https://testnet.train.tech/'}
                                        target="_blank"
                                    >
                                        <ArrowLeftRight />
                                        <span>{isTestnet ? 'Mainnet' : 'Testnet'}</span>
                                        <ArrowUpRight className="ml-auto h-4 w-4" />
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0" />

            <SidebarFooter>
                <SidebarLoginStatus />
            </SidebarFooter>

            <VaulDrawer
                show={walletsDrawerOpen}
                setShow={setWalletsDrawerOpen}
                header="Connected wallets"
                modalId="connectedWallets"
            >
                <VaulDrawer.Snap id="item-1">
                    <WalletsList wallets={wallets} />
                </VaulDrawer.Snap>
            </VaulDrawer>
        </Sidebar>
    )
}

const WalletsSidebarButton: FC<{
    wallets: ReturnType<typeof useWallet>['wallets']
    onOpenDrawer: () => void
}> = ({ wallets, onOpenDrawer }) => {
    if (wallets.length === 0) {
        return (
            <ConnectButton className="w-full">
                <SidebarMenuButton>
                    <WalletIcon className="h-4 w-4" strokeWidth={2} />
                    <span>Connect a wallet</span>
                </SidebarMenuButton>
            </ConnectButton>
        )
    }

    const wallet = wallets[0]

    if (wallets.length === 1) {
        return (
            <SidebarMenuButton onClick={onOpenDrawer}>
                <wallet.icon className="h-4 w-4" />
                <span>
                    {!wallet.isLoading && wallet.address
                        ? new Address(wallet.address, null, wallet.providerName).toShortString()
                        : 'Wallet'}
                </span>
            </SidebarMenuButton>
        )
    }

    return (
        <SidebarMenuButton onClick={onOpenDrawer} className="[&_svg]:size-5">
            <WalletsIcons wallets={wallets} />
            <span>Connected wallets</span>
        </SidebarMenuButton>
    )
}

const SidebarLoginStatus = () => {
    const secretDerivation = useOptionalSecretDerivation()
    const openLoginModal = useLoginModalStore((s) => s.open)
    const [statusOpen, setStatusOpen] = useState(false)

    if (!secretDerivation) return null

    const { method, isLoggedIn, loginWallet, logout, activePasskeyCredentialId } = secretDerivation

    if (!isLoggedIn) {
        return (
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={openLoginModal}>
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

    return (
        <>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" onClick={() => setStatusOpen(true)}>
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

export default AppSidebar
