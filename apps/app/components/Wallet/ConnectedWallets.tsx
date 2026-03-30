import WalletIcon from "../Icons/WalletIcon"
import { Address } from "@/lib/address"
import useWallet from "../../hooks/useWallet"
import ConnectButton from "../buttons/connectButton"
import { useState } from "react"
import WalletsList from "./WalletsList"
import { Wallet } from "../../Models/WalletProvider"
import VaulDrawer from "../Modal/vaulModal"
import { ChevronDown } from "lucide-react"

type WalletsHeaderVariant = "mobile" | "navbar"

const variantStyles: Record<WalletsHeaderVariant, string> = {
    mobile: "p-1.5 max-sm:p-2 text-secondary-text hover:bg-secondary-500 max-sm:bg-secondary-500 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down",
    navbar: "p-1.5 text-secondary-text bg-secondary-500 hover:bg-secondary-400 hover:text-primary-text focus:outline-hidden inline-flex rounded-lg items-center active:animate-press-down",
}

export const WalletsHeader = ({ variant = "mobile" }: { variant?: WalletsHeaderVariant }) => {
    const { wallets } = useWallet()

    if (wallets.length > 0) {
        return (
            <WalletsHeaderWalletsList wallets={wallets} variant={variant} />
        )
    }

    return (
        <ConnectButton>
            <div className={variantStyles[variant]}>
                <WalletIcon className="h-6 w-6 mx-0.5" strokeWidth="2" />
            </div>
        </ConnectButton>
    )
}

const WalletsHeaderWalletsList = ({ wallets, variant = "mobile" }: { wallets: Wallet[]; variant?: WalletsHeaderVariant }) => {
    const [openModal, setOpenModal] = useState<boolean>(false)
    const wallet = wallets[0]

    return <>
        <button type="button" onClick={() => setOpenModal(true)} className={variantStyles[variant]}>
            {variant === "navbar" ? (
                wallets.length === 1 ? (
                    <div className="flex gap-2 items-center text-sm text-secondary-text">
                        <wallet.icon className="h-6 w-6" />
                        {!wallet.isLoading && wallet.address && (
                            <p>{new Address(wallet.address, null, wallet.providerName).toShortString()}</p>
                        )}
                        <ChevronDown className="h-5 w-5" />
                    </div>
                ) : (
                    <div className="flex gap-2 items-center">
                        <WalletsIcons wallets={wallets} />
                        <ChevronDown className="h-5 w-5 text-secondary-text" />
                    </div>
                )
            ) : (
                <WalletsIcons wallets={wallets} />
            )}
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
type WalletsIconsProps = {
    wallets: {
        id: string;
        displayName?: string;
        icon: (props: any) => React.JSX.Element;
    }[]
}
export const WalletsIcons = ({ wallets }: WalletsIconsProps) => {

    const uniqueWallets = wallets.filter((wallet, index, self) => index === self.findIndex((t) => t.id === wallet.id))

    const firstWallet = uniqueWallets[0]
    const secondWallet = uniqueWallets[1]

    return (
        <div className="-space-x-2 flex">
            {
                firstWallet?.displayName &&
                <firstWallet.icon className="rounded-md border-2 border-secondary-400 bg-secondary-500 shrink-0 h-6 w-6" />
            }
            {
                secondWallet?.displayName &&
                <secondWallet.icon className="rounded-md border-2 border-secondary-400 bg-secondary-500 shrink-0 h-6 w-6" />
            }
            {
                uniqueWallets.length > 2 &&
                <div className="h-6 w-6 shrink-0 rounded-md justify-center p-1 bg-secondary-400 text-primary-text overlfow-hidden text-xs">
                    <span><span>+</span>{uniqueWallets.length - 2}</span>
                </div>
            }
        </div>
    )
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
        <button onClick={() => setOpenModal(true)} type="button" className="py-3 px-4 bg-secondary-400 flex items-center w-full rounded-xl space-x-1 disabled:text-secondary-text/40 disabled:bg-secondary-600 disabled:cursor-not-allowed relative font-semibold transform border border-secondary-400 hover:bg-secondary-300 transition duration-200 ease-in-out outline-hidden">
            {
                wallets.length === 1 ?
                    <div className="flex gap-4 items-start text-primary-text">
                        <wallet.icon className='h-5 w-5' />
                        {!wallet.isLoading && wallet.address && <p>{new Address(wallet.address, null, wallet.providerName).toShortString()}</p>}
                    </div>
                    :
                    <>
                        <div className="flex justify-center w-full">
                            Connected wallets
                        </div>
                        <div className="place-items-end absolute left-2.5">
                            <WalletsIcons wallets={wallets} />
                        </div>
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