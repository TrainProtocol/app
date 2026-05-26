import { useNetworks, type Network } from '@train-protocol/react'

interface Props {
    label: string
    value: string
    onChange: (id: string) => void
    exclude?: string
}

export function NetworkSelect({ label, value, onChange, exclude }: Props) {
    const { networks, isLoading } = useNetworks()

    // Only show EVM networks for this demo
    const evmNetworks = networks.filter(
        (n: Network) => n.caip2Id.startsWith('eip155:') && n.caip2Id !== exclude
    )

    return (
        <div className="stack" style={{ gap: 4 }}>
            <label style={{ fontSize: 12, color: '#71717a' }}>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)}>
                <option value="">
                    {isLoading ? 'Loading networks...' : 'Select network'}
                </option>
                {evmNetworks.map((n: Network) => (
                    <option key={n.caip2Id} value={n.caip2Id}>
                        {n.displayName ?? n.caip2Id}
                    </option>
                ))}
            </select>
        </div>
    )
}
