import { FC, useEffect, useState } from "react";
import useWallet from "../../../hooks/useWallet";
import { ChevronDown } from "lucide-react";
import { Wallet } from "../../../Models/WalletProvider";
import VaulDrawer from "../../Modal/vaulModal";
import WalletsList from "../../Wallet/WalletsList";
import { useAtomicState } from "../../../context/atomicContext";
import { useSwapDataState, useSwapDataUpdate } from "../../../context/swap";
import shortenAddress from "../../utils/ShortenAddress";

const ConnectedWallet: FC<{ disabled: boolean }> = ({ disabled }) => {
    const { source_asset, source_network, commitId } = useAtomicState()
    const { selectedSourceAccount } = useSwapDataState()
    const { setSelectedSourceAccount } = useSwapDataUpdate()
    const { provider } = useWallet(source_network, 'withdrawal')
    const [openModal, setOpenModal] = useState(false)

    const changeWallet = async (wallet: Wallet, address: string) => {
        provider?.switchAccount && provider.switchAccount(wallet, address)
        setSelectedSourceAccount({ wallet, address })
        setOpenModal(false)
    }

    const selectedWallet = selectedSourceAccount?.wallet
    const activeWallet = provider?.activeWallet

    useEffect(() => {
        if (!selectedSourceAccount && activeWallet) {
            setSelectedSourceAccount({
                wallet: activeWallet,
                address: activeWallet.address
            })
        } else if (selectedSourceAccount && activeWallet && !activeWallet.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase())) {
            const selectedWalletIsConnected = provider.connectedWallets?.some(w => w.addresses.some(a => a.toLowerCase() === selectedSourceAccount.address.toLowerCase()))
            if (selectedWalletIsConnected) {
                provider.switchAccount && provider.switchAccount(selectedSourceAccount.wallet, selectedSourceAccount.address)
            }
            else {
                setSelectedSourceAccount(undefined)
            }
        }
    }, [activeWallet?.address, setSelectedSourceAccount, provider, selectedSourceAccount?.address])

    return (
        <>
            <div className="grid">
                {
                    selectedWallet &&
                    source_network &&
                    <button type="button" disabled={disabled} onClick={() => setOpenModal(true)} className="cursor-pointer flex rounded-lg justify-between space-x-3 items-center text-primary-text bg-secondary-600 disabled:cursor-not-allowed w-full p-1">
                        <div className="flex items-center space-x-1">
                            <selectedWallet.icon className="h-4 w-4" />
                            <p>
                                {shortenAddress(selectedSourceAccount.address)}
                            </p>
                        </div>
                        {
                            !disabled &&
                            <ChevronDown className="h-4 w-4" />
                        }
                    </button>
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
            }
        </>
    )
}
export default ConnectedWallet;