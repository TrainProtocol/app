import { ChevronRight, ExternalLink } from "lucide-react"
import LinkWrapper from "../LinkWraapper"
import { ReactNode } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Switch } from "@/components/shadcn/switch"

const Menu = ({ children }: { children: ReactNode }) => {
    return <div className="flex flex-col gap-3">
        {children}
    </div>
}

const Group = ({ children }: { children: JSX.Element | JSX.Element[] }) => {
    return (
        <div>
            <div className="divide-y divide-secondary-300 rounded-xl bg-secondary-500 overflow-hidden">
                {children}
            </div>
        </div>
    )
}

const Item = (function Item({ children, pathname, onClick, icon, target = '_self' }: MenuIemProps) {

    return (
        <>
            {
                pathname ?
                    <LinkWrapper href={pathname} target={target} className="gap-4 flex relative cursor-pointer hover:bg-secondary-400 select-none w-full items-center px-4 py-3 outline-none text-primary-text">
                        <div>
                            {icon}
                        </div>
                        <p className="text-primary-text">{children}</p>
                        {
                            target === '_self' ?
                                <ChevronRight className="h-4 w-4 absolute right-3" />
                                :
                                <ExternalLink className="h-4 w-4 absolute right-3" />
                        }
                    </LinkWrapper>
                    :
                    <button
                        type="button"
                        onClick={onClick}
                        className={`gap-4 flex relative cursor-pointer hover:bg-secondary-400 select-none items-center px-4 py-3 outline-none w-full text-primary-text`}
                    >
                        <div>
                            {icon}
                        </div>
                        <p className="text-primary-text">{children}</p>
                        <ChevronRight className="h-4 w-4 absolute right-3" />
                    </button>
            }
        </>

    )
})

export enum ItemType {
    button = 'button',
    link = 'link'
}

type Target = '_blank' | '_self'

type MenuIemProps = {
    children: ReactNode;
    pathname?: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    icon: JSX.Element;
    target?: Target;
};

type ToggleItemProps = {
    children: ReactNode;
    icon: JSX.Element;
    checked: boolean;
    onChange: (checked: boolean) => void;
};

const ToggleItem = ({ children, icon, checked, onChange }: ToggleItemProps) => {
    return (
        <div
            className="gap-4 flex relative cursor-pointer hover:bg-secondary-400 select-none items-center px-4 py-3 outline-none w-full text-primary-text"
        >
            <div>
                {icon}
            </div>
            <p className="text-primary-text">{children}</p>
            <Switch
                checked={checked}
                onCheckedChange={onChange}
                className="absolute right-4"
            />
        </div>
    )
}

type SelectOption = {
    value: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
};

type SelectorItemProps = {
    label: string;
    icon?: JSX.Element;
    value: string;
    onValueChange: (value: string) => void;
    options: SelectOption[];
};

const SelectorItem = ({ label, icon, value, onValueChange, options }: SelectorItemProps) => {
    const current = options.find(o => o.value === value) ?? options[0]
    const CurrentIcon = current.icon

    return (
        <div className="gap-4 flex relative select-none items-center px-4 py-1.5 w-full text-primary-text">
            {icon && <div>{icon}</div>}
            <p className="text-primary-text">{label}</p>
            <div className="ml-auto">
                <Select value={value} onValueChange={onValueChange}>
                    <SelectTrigger>
                        <SelectValue>
                            {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
                            {current.label}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        {options.map(({ value: val, icon: Icon, label: optLabel }) => (
                            <SelectItem key={val} value={val}>
                                {Icon && <Icon className="h-4 w-4" />}
                                {optLabel}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}

Menu.Group = Group
Menu.Item = Item
Menu.ToggleItem = ToggleItem
Menu.SelectorItem = SelectorItem

export default Menu