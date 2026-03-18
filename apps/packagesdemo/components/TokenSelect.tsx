import { useTokens, type Token } from '@train-protocol/react'

interface Props {
    networkId: string
    value: string
    onChange: (contract: string) => void
}

export function TokenSelect({ networkId, value, onChange }: Props) {
    const tokens = useTokens(networkId)

    if (!networkId) return null

    return (
        <div className="stack" style={{ gap: 4 }}>
            <label style={{ fontSize: 12, color: '#71717a' }}>Token</label>
            <select value={value} onChange={e => onChange(e.target.value)}>
                <option value="">Select token</option>
                {tokens.map((t: Token) => (
                    <option key={t.symbol} value={t.symbol}>
                        {t.symbol}
                    </option>
                ))}
            </select>
        </div>
    )
}
