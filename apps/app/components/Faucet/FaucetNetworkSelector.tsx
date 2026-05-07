import { FC } from "react"
import { ExtendedNetwork } from "@/Models/Network"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { ImageWithFallback } from "@/components/Common/ImageWithFallback"

type Props = {
    networks: ExtendedNetwork[]
    value: ExtendedNetwork | null
    onChange: (network: ExtendedNetwork) => void
    disabled?: boolean
}

const FaucetNetworkSelector: FC<Props> = ({ networks, value, onChange, disabled }) => {
    return (
        <Select
            size="lg"
            value={value?.caip2Id ?? ''}
            onValueChange={(v) => {
                const network = networks.find(n => n.caip2Id === v)
                if (network) onChange(network)
            }}
        >
            <SelectTrigger disabled={disabled || networks.length === 0} className="w-full rounded-xl text-primary-text text-base font-medium">
                <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent position="popper" className="rounded-xl" onCloseAutoFocus={e => e.preventDefault()}>
                {networks.map(network => (
                    <SelectItem key={network.caip2Id} value={network.caip2Id} className="rounded-xl">
                        {network.logoUrl && (
                            <ImageWithFallback
                                src={network.logoUrl}
                                alt={network.displayName}
                                width={20}
                                height={20}
                                className="rounded-md"
                            />
                        )}
                        <span>{network.displayName}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export default FaucetNetworkSelector
