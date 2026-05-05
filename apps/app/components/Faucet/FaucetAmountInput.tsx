import { FC, useCallback } from "react"
import clsx from "clsx"
import { Input } from "@/components/shadcn/input"
import { sanitizeDecimalInput } from "@/components/Input/AmountField"

type Props = {
    value: string
    onChange: (v: string) => void
    disabled?: boolean
    symbol?: string
}

const FaucetAmountInput: FC<Props> = ({ value, onChange, disabled, symbol }) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = sanitizeDecimalInput(e.target.value)
        if (v === null) return
        onChange(v)
    }, [onChange])

    return (
        <div
            className={clsx(
                "rounded-xl bg-secondary-500 px-3",
                disabled && "opacity-50",
            )}
        >
            <div className="relative flex items-center h-12 gap-2">
                <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    placeholder="0"
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    className="text-[28px] leading-[34px] focus-visible:ring-0 focus-visible:border-transparent font-normal px-0 truncate bg-transparent border-0 placeholder:text-secondary-text text-primary-text transition-none [font-kerning:none] [font-variant-ligatures:none]"
                />
                {symbol && (
                    <span className="text-primary-text text-base font-medium shrink-0">{symbol}</span>
                )}
            </div>
        </div>
    )
}

export default FaucetAmountInput
