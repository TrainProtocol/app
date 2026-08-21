import { WalletIcon } from "@layerswap/ui-kit"
import { Address } from "@/lib/address"
import useWallet from "@/hooks/useWallet"
import { ConnectButton } from "@layerswap/ui-kit";
import { useState } from "react"
import WalletsList from "./WalletsList"
import type { Wallet } from "@layerswap/widget-types";
import VaulDrawer from "../Modal/vaulModal"
import { useConnectModal } from "@/components/WalletModal"
import WalletsDialog from "@/components/Sidebar/WalletsDialog"
import useWindowDimensions from "@/hooks/useWindowDimensions"
import { WalletIconView, WalletsIcons } from "@layerswap/ui-kit";

export const WalletsHeader = () => {
    const { wallets } = useWallet()
    const { isMobile } = useWindowDimensions()
    const { connect } = useConnectModal()
    const [walletsOpen, setWalletsOpen] = useState(false)

    const noWallets = wallets.length === 0

    const onClick = () => {
        if (!noWallets) setWalletsOpen(true)
        else connect(undefined, { displayMode: 'dialog' })
    }

    if (isMobile) {
        return (
            <>
                <button
                    type="button"
                    onClick={onClick}
                    aria-label="Wallets"
                    className="p-1.5 max-sm:p-2 active:animate-press-down justify-self-start text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {noWallets
                        ? <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
                        : <WalletsIcons wallets={wallets} />}
                </button>
                <WalletsDialog open={walletsOpen} onOpenChange={setWalletsOpen} />
            </>
        )
    }

    const isMulti = wallets.length > 1
    const { label, icon } = getDesktopContent(wallets)
    return (
        <>
            <button
                type="button"
                onClick={onClick}
                aria-label={label}
                className={`inline-flex items-center gap-2 ${isMulti ? 'py-1.5' : 'py-2'} px-3 rounded-xl bg-secondary-700 border border-border text-primary-text hover:bg-secondary-500 focus:outline-none transition-colors active:animate-press-down disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {icon}
                <span className="text-sm font-medium truncate max-w-[140px]">{label}</span>
            </button>
            <WalletsDialog open={walletsOpen} onOpenChange={setWalletsOpen} />
        </>
    )
}

const getDesktopContent = (wallets: Wallet[]): { label: string; icon: React.JSX.Element } => {
    if (wallets.length === 0) return { label: 'Connect wallet', icon: <WalletIcon className="h-5 w-5 shrink-0" strokeWidth={2} /> }
    if (wallets.length > 1) return { label: 'Connected wallets', icon: <WalletsIcons wallets={wallets} /> }
    const w = wallets[0]
    const label = w.address && !w.isLoading ? new Address(w.address, null, w.providerName).toShortString() : 'Wallet'
    return { label, icon: <WalletIconView wallet={w} className="h-5 w-5 shrink-0 rounded-[6px]" size={20} /> }
}
export const WalletsMenu = () => {
    const { wallets } = useWallet()

    if (wallets.length > 0) {
        return (
            <WalletsMenuWalletsList wallets={wallets} />
        )
    }

    return (
        <ConnectButton>
            <div className="active:animate-press-down items-center space-x-1 disabled:cursor-not-allowed relative w-full flex justify-center font-semibold rounded-xl transform hover:brightness-125 transition duration-200 ease-in-out py-3 md:px-3 bg-secondary-400 border-none text-primary-text! px-4!" >
                <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                    <WalletIcon className="h-6 w-6" strokeWidth="2" />
                </span>
                <span className="grow text-center">Connect a wallet</span>
            </div>
        </ConnectButton>
    )
}

const WalletsMenuWalletsList = ({ wallets }: { wallets: Wallet[] }) => {
    const wallet = wallets[0]
    const [openModal, setOpenModal] = useState<boolean>(false)

    return <>
        <button onClick={() => setOpenModal(true)} type="button" className="py-3 px-4 text-primary-text bg-secondary-400 flex items-center w-full rounded-xl space-x-1 disabled:text-secondary-text/40 disabled:bg-secondary-600 disabled:cursor-not-allowed relative font-semibold transform border border-secondary-400 hover:bg-secondary-300 transition duration-200 ease-in-out outline-hidden">
            {
                wallets.length === 1 ?
                    <>
                        <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                            <WalletIconView wallet={wallet} className="h-5 w-5 rounded-[6px]" size={20} />
                        </span>
                        <span className="grow text-center">
                            {!wallet.isLoading && wallet.address && new Address(wallet.address, null, wallet.providerName).toShortString()}
                        </span>
                    </>
                    :
                    <>
                        <span className="order-first absolute left-0 inset-y-0 flex items-center pl-3">
                            <WalletsIcons wallets={wallets} />
                        </span>
                        <span className="grow text-center">Connected wallets</span>
                    </>
            }
        </button>
        <VaulDrawer
            show={openModal}
            setShow={setOpenModal}
            header={`Connected wallets`}
            modalId="connectedWallets"
        >
            <VaulDrawer.Snap id="item-1">
                <WalletsList wallets={wallets} />
            </VaulDrawer.Snap>
        </VaulDrawer>
    </>
}
