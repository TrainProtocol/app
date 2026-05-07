import { ChangeEvent, FC, Ref, useState } from "react"
import { Pencil } from "lucide-react"
import { Input } from "@/components/shadcn/input"
import { Network } from "@/Models/Network"
import { Partner } from "@/Models/Partner"
import { SwapFormValues } from "@/components/DTOs/SwapFormValues"
import { FormikHelpers } from "formik"
import FilledX from "@/components/Icons/FilledX"
import AddressWithIcon from "./AddressWithIcon"
import { AddressGroup, AddressItem } from "."
import { Address } from "@/lib/address"

type AddressInput = {
    manualAddress: string,
    setManualAddress: (address: string) => void,
    setNewAddress: (value: { address: string, networkType: string | string } | undefined) => void,
    values: SwapFormValues,
    partner?: Partner,
    name: string,
    inputReference: React.Ref<HTMLInputElement>,
    setFieldValue: FormikHelpers<SwapFormValues>['setFieldValue'],
    close: () => void,
    addresses: AddressItem[] | undefined,
}

const ManualAddressInput: FC<AddressInput> = ({ manualAddress, setManualAddress, setNewAddress, values, name, inputReference, setFieldValue, close, addresses, partner }) => {
    const { to: destination } = values || {}

    const handleSave = () => {
        if (Address.isValid(manualAddress, destination) && destination) {
            setNewAddress({ address: manualAddress, networkType: destination.networkType })
            setManualAddress("")
        }
        else if (!destination) {
            setFieldValue('destination_address', manualAddress)
        }
        close()
    }

    const previewItemOverride = destination
        ? addresses?.find(a => Address.equals(a.address, manualAddress, destination))
        : undefined

    return (
        <ManualAddressInputCore
            value={manualAddress}
            onChange={setManualAddress}
            onSave={handleSave}
            network={destination ?? undefined}
            inputRef={inputReference}
            name={name}
            partner={partner}
            previewItemOverride={previewItemOverride}
        />
    )
}

export default ManualAddressInput

type CoreProps = {
    value: string
    onChange: (v: string) => void
    onSave: () => void
    network: Network | undefined
    inputRef?: Ref<HTMLInputElement>
    name?: string
    partner?: Partner
    previewItemOverride?: AddressItem
}

export const ManualAddressInputCore: FC<CoreProps> = ({ value, onChange, onSave, network, inputRef, name, partner, previewItemOverride }) => {
    const [isFocused, setIsFocused] = useState(false)

    const isValid = !!value && Address.isValid(value, network)
    const errorMessage = value && !isValid && network?.displayName
        ? `Enter a valid ${network.displayName} address`
        : ''
    const previewItem = value && !errorMessage
        ? (previewItemOverride ?? { address: value, group: AddressGroup.ManualAdded })
        : undefined

    return (
        <div className="text-left pt-1">
            <div className="relative flex grow rounded-lg shadow-xs w-full">
                <Input
                    value={value}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                    ref={inputRef}
                    name={name}
                    id={name}
                    tabIndex={0}
                    placeholder="Enter address"
                    autoCorrect="off"
                    type="text"
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSave() }}
                    className="pr-12 h-12 rounded-lg font-semibold truncate hover:overflow-x-scroll placeholder:text-primary-text-tertiary/80 placeholder:font-normal placeholder:pl-8 focus:placeholder:pl-0 focus:placeholder:text-left"
                />
                {!isFocused && !value && (
                    <Pencil className="h-5 w-5 text-primary-text-tertiary absolute inset-y-0 top-[calc(50%-10px)] left-4" />
                )}
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="absolute top-[calc(50%-10px)] right-4 hover:bg-secondary-400 text-primary-text-tertiary"
                    >
                        <FilledX className="h-5 w-5" />
                    </button>
                )}
            </div>
            {errorMessage && (
                <div className="basis-full w-full text-start text-xs text-error-foreground">{errorMessage}</div>
            )}
            {previewItem && (
                <div
                    onClick={onSave}
                    className="group/addressItem text-left min-h-12 cursor-pointer space-x-2 bg-secondary-400 shadow-xl flex text-sm rounded-md items-center w-full transform hover:bg-secondary-500 transition duration-200 p-3 hover:shadow-xl mt-3"
                >
                    <AddressWithIcon addressItem={previewItem} partner={partner} network={network} />
                </div>
            )}
        </div>
    )
}
