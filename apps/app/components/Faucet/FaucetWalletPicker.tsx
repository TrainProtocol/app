import { FC, useState } from "react"
import { Check } from "lucide-react"
import clsx from "clsx"
import { ExtendedNetwork } from "@/Models/Network"
import { Wallet } from "@/Models/WalletProvider"
import { Address } from "@/lib/address"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/shadcn/popover"
import MobileTooltip from "@/components/Modal/mobileTooltip"
import { AddressInputField } from "@/components/Input/Address/AddressPicker/ManualAddressInput"

type Props = {
    network: ExtendedNetwork | null
    wallets: Wallet[]
    value: string | null
    onChange: (address: string) => void
    disabled?: boolean
}

const FaucetWalletPicker: FC<Props> = ({ network, wallets, value, onChange, disabled }) => {
    const [open, setOpen] = useState(false)

    const canOpen = !!network && !disabled && wallets.length > 0
    const inputDisabled = disabled || !network
    const isValid = !!value && Address.isValid(value, network ?? undefined)
    const errorMessage = value && !isValid && network?.displayName
        ? `Enter a valid ${network.displayName} address`
        : ""
    const showError = !!errorMessage && !(open && canOpen)

    const handleSelect = (address: string) => {
        onChange(address)
        setOpen(false)
    }

    return (
        <Popover open={open && canOpen} onOpenChange={setOpen}>
            <div className="text-left">
                <PopoverAnchor>
                    <AddressInputField
                        value={value ?? ""}
                        onChange={onChange}
                        onFocus={() => canOpen && setOpen(true)}
                        onBlur={() => setOpen(false)}
                        disabled={inputDisabled}
                        wrapperClassName="rounded-xl"
                        inputClassName="rounded-xl text-primary-text"
                    />
                </PopoverAnchor>
                {showError && (
                    <div className="basis-full w-full text-start text-xs text-error-foreground">{errorMessage}</div>
                )}
            </div>
            <PopoverContent
                align="start"
                sideOffset={6}
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="w-(--radix-popover-trigger-width) max-w-(--radix-popover-trigger-width) p-2 rounded-2xl"
            >
                {network && (
                    <div className="flex flex-col gap-0.5">
                        {wallets.map((wallet, index) => {
                            const isSelected = !!value && Address.equals(wallet.address, value, network)
                            return (
                                <button
                                    type="button"
                                    key={`${index}${wallet.providerName}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelect(wallet.address)}
                                    className={clsx(
                                        "flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-primary-text transition-colors",
                                        isSelected ? "bg-secondary-400 hover:bg-secondary-300" : "bg-secondary-500 hover:bg-secondary-400",
                                    )}
                                >
                                    <wallet.icon className="w-7 h-7 rounded-md bg-secondary-800 p-0.5 shrink-0" />
                                    <MobileTooltip
                                        trigger={
                                            <span className="font-medium truncate">
                                                {new Address(wallet.address, network).toShortString()}
                                            </span>
                                        }
                                    >
                                        <span className="font-mono break-all">
                                            {new Address(wallet.address, network).full}
                                        </span>
                                    </MobileTooltip>
                                    <span className="ml-auto text-xs text-secondary-text truncate">
                                        {wallet.displayName}
                                    </span>
                                    {isSelected && <Check className="w-4 h-4 text-primary-text shrink-0" />}
                                </button>
                            )
                        })}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

export default FaucetWalletPicker
