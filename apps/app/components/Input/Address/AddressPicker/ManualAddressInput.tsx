import { ChangeEvent, FC, KeyboardEvent, Ref, useState } from "react"
import { Pencil } from "lucide-react"
import { Input } from "@/components/shadcn/input"
import { Partner } from "@/Models/Partner"
import { SwapFormValues } from "@/components/DTOs/SwapFormValues"
import { FormikHelpers } from "formik"
import FilledX from "@/components/Icons/FilledX"
import AddressWithIcon from "./AddressWithIcon"
import { AddressGroup, AddressItem } from "."
import { Address } from "@/lib/address"
import { cn } from "@/lib/utils"

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

    const isValid = !!manualAddress && Address.isValid(manualAddress, destination)
    const errorMessage = manualAddress && !isValid && destination?.displayName
        ? `Enter a valid ${destination.displayName} address`
        : ''
    const previewItemOverride = destination
        ? addresses?.find(a => Address.equals(a.address, manualAddress, destination))
        : undefined
    const previewItem = manualAddress && !errorMessage
        ? (previewItemOverride ?? { address: manualAddress, group: AddressGroup.ManualAdded })
        : undefined

    return (
        <div className="text-left pt-1">
            <AddressInputField
                value={manualAddress}
                onChange={setManualAddress}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                name={name}
                inputRef={inputReference}
            />
            {errorMessage && (
                <div className="basis-full w-full text-start text-xs text-error-foreground">{errorMessage}</div>
            )}
            {previewItem && (
                <div
                    onClick={handleSave}
                    className="group/addressItem text-left min-h-12 cursor-pointer space-x-2 bg-secondary-400 shadow-xl flex text-sm rounded-md items-center w-full transform hover:bg-secondary-500 transition duration-200 p-3 hover:shadow-xl mt-3"
                >
                    <AddressWithIcon addressItem={previewItem} partner={partner} network={destination} />
                </div>
            )}
        </div>
    )
}

export default ManualAddressInput

type AddressInputFieldProps = {
    value: string
    onChange: (v: string) => void
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
    onClick?: () => void
    name?: string
    inputRef?: Ref<HTMLInputElement>
    disabled?: boolean
    inputClassName?: string
    wrapperClassName?: string
}

export const AddressInputField: FC<AddressInputFieldProps> = ({
    value,
    onChange,
    onKeyDown,
    onClick,
    name,
    inputRef,
    disabled,
    inputClassName,
    wrapperClassName,
}) => {
    const [isFocused, setIsFocused] = useState(false)
    return (
        <div className={cn("relative flex grow rounded-lg shadow-xs w-full", wrapperClassName)}>
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
                disabled={disabled}
                onClick={onClick}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={onKeyDown}
                className={cn("pr-12 h-12 rounded-lg font-semibold truncate hover:overflow-x-scroll placeholder:text-secondary-text placeholder:font-normal placeholder:pl-8 focus:placeholder:pl-0 focus:placeholder:text-left disabled:opacity-50! disabled:cursor-not-allowed disabled:pointer-events-auto", inputClassName)}
            />
            {!isFocused && !value && (
                <Pencil className="h-5 w-5 text-primary-text-tertiary absolute inset-y-0 top-[calc(50%-10px)] left-4 pointer-events-none" />
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
    )
}
