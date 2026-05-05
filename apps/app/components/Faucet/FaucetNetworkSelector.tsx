import { FC, useMemo } from "react"
import { useSettingsState } from "@/context/settings"
import { ExtendedNetwork } from "@/Models/Network"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { ImageWithFallback } from "@/components/Common/ImageWithFallback"
import { FAUCET_CONTRACTS } from "@/lib/faucet/contracts"

type Props = {
    value: ExtendedNetwork | null
    onChange: (network: ExtendedNetwork) => void
}

const FaucetNetworkSelector: FC<Props> = ({ value, onChange }) => {
    const { networks } = useSettingsState()

    const faucetNetworks = useMemo(() => {
        const allowed = new Set(FAUCET_CONTRACTS.map(c => c.caip2Id))
        return networks.filter(n => allowed.has(n.caip2Id))
    }, [networks])

    return (
        <Select
            size="lg"
            value={value?.caip2Id ?? ''}
            onValueChange={(v) => {
                const network = faucetNetworks.find(n => n.caip2Id === v)
                if (network) onChange(network)
            }}
        >
            <SelectTrigger disabled={faucetNetworks.length === 0} className="w-full rounded-xl text-primary-text text-base font-medium">
                <SelectValue placeholder="Select network" />
            </SelectTrigger>
            <SelectContent position="popper" className="rounded-xl" onCloseAutoFocus={e => e.preventDefault()}>
                {faucetNetworks.map(network => (
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
