import { FC, useState } from "react"
import { ChevronDown, Pencil } from "lucide-react"
import { ExtendedNetwork } from "@/Models/Network"
import { SelectAccountProps, Wallet, WalletProvider } from "@/Models/WalletProvider"
import { Address } from "@/lib/address"
import VaulDrawer from "@/components/Modal/vaulModal"
import ConnectedWallets from "@/components/Input/Address/AddressPicker/ConnectedWallets"
import { ManualAddressInputCore } from "@/components/Input/Address/AddressPicker/ManualAddressInput"

type Props = {
    network: ExtendedNetwork | null
    wallets: Wallet[]
    notCompatibleWallets: Wallet[]
    provider: WalletProvider | undefined
    value: string | null
    onChange: (address: string) => void
}

const FaucetWalletPicker: FC<Props> = ({ network, wallets, notCompatibleWallets, provider, value, onChange }) => {
    const [open, setOpen] = useState(false)
    const [manualInput, setManualInput] = useState("")

    const matchedWallet = network && value
        ? wallets.find(w => w.addresses?.some(a => Address.equals(a, value, network)))
        : undefined

    const handleSelectAddress = (address: string) => {
        onChange(address)
        setOpen(false)
        setManualInput("")
    }

    return (
        <>
            <button
                type="button"
                disabled={!network}
                onClick={() => setOpen(true)}
                className="flex items-center justify-between w-full px-3 py-3 rounded-xl bg-secondary-500 enabled:hover:bg-secondary-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
            >
                <span className="flex items-center gap-2 min-w-0">
                    {value && network ? (
                        <>
                            {matchedWallet ? (
                                <matchedWallet.icon className="w-6 h-6 rounded-md shrink-0" />
                            ) : (
                                <Pencil className="w-5 h-5 text-secondary-text shrink-0" />
                            )}
                            <span className="text-primary-text font-medium truncate">
                                {new Address(value, network).toShortString()}
                            </span>
                        </>
                    ) : (
                        <span className="text-secondary-text">Recipient address</span>
                    )}
                </span>
                <ChevronDown className="w-4 h-4 text-secondary-text shrink-0" />
            </button>

            <VaulDrawer
                mode="fitHeight"
                show={open}
                setShow={setOpen}
                header="Recipient address"
                modalId="faucetAddress"
            >
                <VaulDrawer.Snap id="item-1" className="pb-4">
                    <div className="w-full flex flex-col text-primary-text">
                        <div className="flex flex-col self-center w-full space-y-5">
                            <ManualAddressInputCore
                                value={manualInput}
                                onChange={setManualInput}
                                onSave={() => {
                                    if (network && Address.isValid(manualInput, network)) handleSelectAddress(manualInput)
                                }}
                                network={network ?? undefined}
                            />

                            {network && provider && !manualInput && (
                                <ConnectedWallets
                                    provider={provider}
                                    notCompatibleWallets={notCompatibleWallets}
                                    onClick={(props: SelectAccountProps) => handleSelectAddress(props.address)}
                                    onConnect={(wallet) => handleSelectAddress(wallet.address)}
                                    destination={network}
                                    destination_address={value ?? undefined}
                                />
                            )}
                        </div>
                    </div>
                </VaulDrawer.Snap>
            </VaulDrawer>
        </>
    )
}

export default FaucetWalletPicker
