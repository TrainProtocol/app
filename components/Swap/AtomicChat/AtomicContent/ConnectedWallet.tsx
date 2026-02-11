import { FC, useEffect, useState } from "react";
import useWallet from "../../../../hooks/useWallet";
import { truncateDecimals } from "../../../utils/RoundDecimals";
import AddressWithIcon from "../../../Input/Address/AddressPicker/AddressWithIcon";
import { AddressGroup } from "../../../Input/Address/AddressPicker";
import { ChevronRight } from "lucide-react";
import { Wallet } from "../../../../Models/WalletProvider";
import VaulDrawer from "../../../Modal/vaulModal";
import WalletsList from "../../../Wallet/WalletsList";
import { useAtomicState } from "../../../../context/atomicContext";
import { useSettingsState } from "../../../../context/settings";
import { useSelectedAccount, useSelectSwapAccount } from "../../../../context/swapAccounts";

const Component: FC = () => {
    const { source_asset, source_network, commitId } = useAtomicState()
    const { provider } = useWallet(source_network, 'withdrawal')
    const { networks } = useSettingsState()
    const sourceNetworkWithTokens = networks.find(n => n.slug === source_network?.slug)
    const [openModal, setOpenModal] = useState(false)
    const selectedSourceAccount = useSelectedAccount("from", source_network?.slug)
    const selectSourceAccount = useSelectSwapAccount("from")

    const changeWallet = async (wallet: Wallet, address: string) => {
        provider?.switchAccount && provider.switchAccount(wallet, address)
        selectSourceAccount({ address, id: wallet.id, providerName: wallet.providerName })
        setOpenModal(false)
    }

    const selectedWallet = selectedSourceAccount && provider?.connectedWallets?.find(w => w.id === selectedSourceAccount.id && w.addresses?.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase()))
    const activeWallet = provider?.activeWallet

    // useEffect(() => {
    //     if (!selectedSourceAccount && activeWallet) {
    //         selectSourceAccount({ address: activeWallet.address, id: activeWallet.id, providerName: activeWallet.providerName })
    //     } else if (selectedSourceAccount && activeWallet && !activeWallet.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase())) {
    //         const selectedWalletIsConnected = provider.connectedWallets?.some(w => w.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase()))
    //         if (selectedWalletIsConnected) {
    //             const wallet = provider.connectedWallets?.find(w => w.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase()))
    //             wallet && provider.switchAccount && provider.switchAccount(wallet, selectedSourceAccount.address)
    //         }
    //         else {
    //             selectSourceAccount({ address: activeWallet.address, id: activeWallet.id, providerName: activeWallet.providerName })
    //         }
    //     }
    // }, [activeWallet?.address, selectSourceAccount, provider, selectedSourceAccount?.address])



    return (
        !commitId &&
        <>
            {/* <div className="grid content-end">
                {
                    selectedWallet &&
                    source_network &&
                    <div onClick={() => setOpenModal(true)} className="cursor-pointer group/addressItem flex rounded-lg justify-between space-x-3 items-center mt-1.5 text-primary-text bg-secondary-700 disabled:cursor-not-allowed h-12 leading-4 font-medium w-full px-3 py-7">
                        <AddressWithIcon
                            addressItem={{ address: selectedSourceAccount?.address || '', group: AddressGroup.ConnectedWallet }}
                            connectedWallet={selectedWallet}
                            network={source_network}
                            balance={(walletBalanceAmount !== undefined && source_asset) ? { amount: walletBalanceAmount, symbol: source_asset?.symbol, isLoading: isBalanceLoading } : undefined}
                        />
                        <ChevronRight className="h-4 w-4" />
                    </div>
                }
            </div>
            {
                source_network &&
                source_asset &&
                provider &&
                provider.connectedWallets &&
                <VaulDrawer
                    show={openModal}
                    setShow={setOpenModal}
                    header={`Send from`}
                    modalId="connectedWallets"
                >
                    <VaulDrawer.Snap id='item-1'>
                        <WalletsList
                            network={source_network}
                            token={source_asset}
                            onSelect={changeWallet}
                            selectable
                            wallets={provider.connectedWallets}
                            provider={provider}
                        />
                    </VaulDrawer.Snap>
                </VaulDrawer>
            } */}
        </>
    )
}
export default Component;