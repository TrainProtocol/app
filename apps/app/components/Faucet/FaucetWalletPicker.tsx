import { FC, useRef, useState } from "react"
import { Check } from "lucide-react"
import clsx from "clsx"
import { ExtendedNetwork } from "@/Models/Network"
import { Wallet } from "@layerswap/utils";
import { Address } from "@/lib/address"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/shadcn/popover"
import MobileTooltip from "@/components/Modal/mobileTooltip"
import { AddressInputField } from "@/components/Input/Address/AddressPicker/ManualAddressInput"
import WalletIconView from "@/components/Wallet/WalletIconView"

type Props = {
    network: ExtendedNetwork | null
    wallets: Wallet[]
    value: string | null
    onChange: (address: string) => void
    disabled?: boolean
}

const FaucetWalletPicker: FC<Props> = ({ network, wallets, value, onChange, disabled }) => {
    const [open, setOpen] = useState(false)
    const anchorRef = useRef<HTMLDivElement>(null)

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
            <div ref={anchorRef} className="text-left">
                <PopoverAnchor>
                    <AddressInputField
                        value={value ?? ""}
                        onChange={onChange}
                        onFocus={() => canOpen && setOpen(true)}
                        onBlur={() => setOpen(false)}
                        onClick={() => canOpen && setOpen(true)}
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
                onPointerDownOutside={(e) => {
                    if (anchorRef.current?.contains(e.target as Node)) {
                        e.preventDefault()
                    }
                }}
                onFocusOutside={(e) => {
                    if (anchorRef.current?.contains(e.target as Node)) {
                        e.preventDefault()
                    }
                }}
                className="w-(--radix-popover-trigger-width) max-w-(--radix-popover-trigger-width) p-2 rounded-2xl"
            >
                {network && (
                    <div className="flex flex-col gap-0.5">
                        {wallets.flatMap((wallet, wIdx) => wallet.addresses.map((address, aIdx) => {
                            const isSelected = !!value && Address.equals(address, value, network)
                            return (
                                <button
                                    type="button"
                                    key={`${wIdx}-${aIdx}-${wallet.providerName}`}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelect(address)}
                                    className={clsx(
                                        "flex w-full items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-primary-text transition-colors",
                                        isSelected ? "bg-secondary-300" : "bg-secondary-500 hover:bg-secondary-300",
                                    )}
                                >
                                    <WalletIconView wallet={wallet} className="w-9 h-9 rounded-md bg-secondary-800 p-0.5 shrink-0" />
                                    <div className="flex flex-col items-start min-w-0 grow text-left">
                                        <MobileTooltip
                                            trigger={
                                                <span className="font-medium text-sm truncate">
                                                    {new Address(address, network).toShortString()}
                                                </span>
                                            }
                                        >
                                            <span className="font-mono break-all">
                                                {new Address(address, network).full}
                                            </span>
                                        </MobileTooltip>
                                        <span className="text-xs text-secondary-text truncate">
                                            {wallet.displayName}
                                        </span>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-primary-text shrink-0" />}
                                </button>
                            )
                        }))}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

export default FaucetWalletPicker
